// Fase 8B.2 -- sesiones obsoletas: ¿qué pasa con una cookie YA EMITIDA
// cuando el rol de ese usuario cambia, o el usuario se elimina, DESPUÉS de
// haber iniciado sesión? Mismo contrato que run-admin-authorization.mjs
// (servidor real, puerto 3100, Supabase local). No se implementa
// revocación de JWT ni desactivación de cuentas en esta fase -- esta
// prueba confirma el comportamiento REAL dado lo que sí existe
// (verificación fresca contra la base en cada solicitud protegida vía
// lib/admin-authorize.ts), no afirma una garantía más fuerte que esa.
import { loadAndAssertTestEnv } from "../../scripts/test-env.mjs";
import { execFileSync } from "node:child_process";

const env = loadAndAssertTestEnv();
const BASE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

function psqlExec(sql) {
  execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
}

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login falló para ${email}: ${res.status}`);
  return res.headers.get("set-cookie").split(";")[0];
}

function assertCookieAdminId(cookie, expectedId, scenario) {
  const token = cookie.slice(cookie.indexOf("=") + 1);
  const [, payload] = token.split(".");
  if (!payload) throw new Error(`${scenario}: la cookie no contiene un JWT válido.`);

  let adminId;
  try {
    adminId = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).adminId;
  } catch {
    throw new Error(`${scenario}: no se pudo leer el identificador de la sesión.`);
  }
  if (adminId !== expectedId) {
    throw new Error(`${scenario}: la cookie no pertenece al fixture creado.`);
  }
}

async function request(method, path, cookie, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return {
    status: res.status,
    body: json,
    path: new URL(res.url).pathname,
    redirected: res.redirected,
    hasLocation: res.headers.has("location"),
  };
}

function isDirectUnauthorized(response, path) {
  return response.status === 401
    && response.path === path
    && !response.redirected
    && !response.hasLocation
    && response.body?.error === "No autorizado.";
}

const SUPERADMIN = { email: "admin@test.local", password: "TestAdmin123!" };
const SYNTH_PASSWORD = "Stale8B2Pass!";
const results = [];
function record(scenario, pass, notes) {
  results.push({ scenario, pass, notes });
  console.log(`[${pass ? "OK  " : "FAIL"}] ${scenario}${notes ? ` -- ${notes}` : ""}`);
}

let superadminCookie;
const createdIds = {};

async function createUser(role, email, name) {
  const res = await request("POST", "/api/admin/users", superadminCookie, {
    name,
    email,
    password: SYNTH_PASSWORD,
    role,
  });
  if (res.status !== 201) throw new Error(`no se pudo crear ${email}: ${JSON.stringify(res.body)}`);
  return res.body.id;
}

async function changeRole(id, role) {
  const res = await request("PUT", `/api/admin/users/${id}`, superadminCookie, { name: "x", role });
  if (res.status !== 200) throw new Error(`no se pudo cambiar el rol de ${id} a ${role}: ${JSON.stringify(res.body)}`);
}

async function deleteUser(id) {
  const res = await request("DELETE", `/api/admin/users/${id}`, superadminCookie);
  if (res.status !== 200) {
    throw new Error(`no se pudo eliminar ${id}: ${res.status} ${JSON.stringify(res.body)}`);
  }
}

async function main() {
  console.log(`\n== Fase 8B.2 -- sesiones obsoletas contra ${BASE_URL} ==\n`);

  // Limpieza de una corrida anterior interrumpida.
  psqlExec(`delete from admin_users where email like 'synth-stale-%@test.local';`);

  superadminCookie = await login(SUPERADMIN.email, SUPERADMIN.password);

  try {
    // 1) Editor convertido en viewer: la cookie vieja debe perder acceso
    //    de escritura en la PRIMERA solicitud posterior al cambio.
    {
       const id = await createUser("editor", "synth-stale-1@test.local", "Stale Editor->Viewer");
       createdIds.one = id;
       const oldCookie = await login("synth-stale-1@test.local", SYNTH_PASSWORD);
       assertCookieAdminId(oldCookie, id, "editor->viewer");

      const before = await request("POST", "/api/admin/tags", oldCookie, { name: "Stale Tag Before", color: "#000000" });
      record("editor (antes del cambio) puede crear una etiqueta", before.status === 201, `status=${before.status}`);
      if (before.status === 201) psqlExec(`delete from tags where name = 'Stale Tag Before';`);

      await changeRole(id, "viewer");

      const after = await request("POST", "/api/admin/tags", oldCookie, { name: "Stale Tag After", color: "#000000" });
      record(
        "editor->viewer: la MISMA cookie ya no puede crear una etiqueta en la primera solicitud posterior al cambio",
        after.status === 403,
        `status=${after.status} body=${JSON.stringify(after.body)}`,
      );

      const stillReads = await request("GET", "/api/admin/tags", oldCookie);
      record(
        "editor->viewer: la misma cookie SÍ conserva lectura (viewer tiene tags.read)",
        stillReads.status === 200,
        `status=${stillReads.status}`,
      );
    }

    // 2) Usuario convertido en vendedor: pierde TODO acceso de API salvo heartbeat.
    {
       const id = await createUser("editor", "synth-stale-2@test.local", "Stale ->Vendedor");
       createdIds.two = id;
       const oldCookie = await login("synth-stale-2@test.local", SYNTH_PASSWORD);
       assertCookieAdminId(oldCookie, id, "editor->vendedor");

      await changeRole(id, "vendedor");

      // proxy.ts decide la rama "vendedor" por el ROL DEL JWT (optimista) --
      // como este JWT se emitió cuando todavía era editor, proxy.ts NO lo
      // reconoce como vendedor todavía (ver comentario en proxy.ts). La capa
      // autoritativa (requireAdminPermission) sí usa el rol fresco de la
      // base y lo bloquea igual, por una razón distinta (ya no tiene
      // tags.write) -- el resultado observable (403) es el mismo, documentado
      // explícitamente para no afirmar una causa que no es.
      const after = await request("POST", "/api/admin/tags", oldCookie, { name: "Stale Tag Vendedor", color: "#000000" });
      record(
        "editor->vendedor: la misma cookie ya no puede escribir (bloqueada por requireAdminPermission con el rol fresco, no por la rama vendedor de proxy.ts -- su JWT todavía dice editor)",
        after.status === 403,
        `status=${after.status}`,
      );
    }

    // 3) Vendedor promovido a editor: caso inverso documentado en proxy.ts --
    //    la rama "vendedor" de proxy.ts sigue activa con el JWT viejo hasta
    //    un nuevo login, así que queda MÁS restringido de lo que ya le
    //    correspondería (no es un hueco de seguridad, es sub-privilegio).
    {
       const id = await createUser("vendedor", "synth-stale-3@test.local", "Stale Vendedor->Editor");
       createdIds.three = id;
       const oldCookie = await login("synth-stale-3@test.local", SYNTH_PASSWORD);
       assertCookieAdminId(oldCookie, id, "vendedor->editor");

      await changeRole(id, "editor");

      const after = await request("GET", "/api/admin/tags", oldCookie);
      record(
        "vendedor->editor: la cookie vieja SIGUE bloqueada por la rama optimista de proxy.ts (JWT todavía dice vendedor) -- confirma el caso inverso documentado, no una garantía de acceso inmediato",
        after.status === 403,
        `status=${after.status} body=${JSON.stringify(after.body)}`,
      );

      const freshCookie = await login("synth-stale-3@test.local", SYNTH_PASSWORD);
      const afterRelogin = await request("GET", "/api/admin/tags", freshCookie);
      record(
        "vendedor->editor: un login nuevo SÍ refleja el rol actual de inmediato",
        afterRelogin.status === 200,
        `status=${afterRelogin.status}`,
      );
    }

    // 4) Superadmin degradado con la misma cookie: conservar admin@test
    // como raíz permite verificar el cambio sin perder la cuenta de limpieza.
    {
       const id = await createUser("superadmin", "synth-stale-4@test.local", "Stale Superadmin->Viewer");
       createdIds.four = id;
       const oldCookie = await login("synth-stale-4@test.local", SYNTH_PASSWORD);
       assertCookieAdminId(oldCookie, id, "superadmin->viewer");

      const before = await request("GET", "/api/admin/users", oldCookie);
      record("superadmin sintético (antes del cambio) puede administrar usuarios", before.status === 200, `status=${before.status}`);

      await changeRole(id, "viewer");
      const after = await request("GET", "/api/admin/users", oldCookie);
      record(
        "superadmin->viewer: la MISMA cookie pierde users.manage en la primera solicitud protegida posterior al cambio",
        after.status === 403,
        `status=${after.status} body=${JSON.stringify(after.body)}`,
      );
    }

    // 5) Usuario eliminado con cookie previamente válida.
     {
       const id = await createUser("editor", "synth-stale-5@test.local", "Stale Deleted");
       const oldCookie = await login("synth-stale-5@test.local", SYNTH_PASSWORD);
       assertCookieAdminId(oldCookie, id, "usuario eliminado");

       const heartbeatBefore = await request("POST", "/api/admin/heartbeat", oldCookie);
       const before = await request("GET", "/api/admin/tags", oldCookie);
       if (heartbeatBefore.status !== 200) {
         throw new Error(`usuario eliminado: heartbeat previo falló con ${heartbeatBefore.status}`);
       }
       record("usuario (antes de eliminarlo) puede leer etiquetas", before.status === 200, `status=${before.status}`);

       const cookieBeforeDelete = oldCookie;
       await deleteUser(id);
       createdIds.five = null; // ya no hace falta borrarlo en la limpieza final

      const persistedAfterDelete = psql(`select id from admin_users where id = '${id}';`);
      record(
        "usuario eliminado: PostgreSQL ya no contiene la fila antes de reutilizar la cookie",
        persistedAfterDelete === "",
        `fila=${persistedAfterDelete || "ausente"}`,
      );

       const heartbeatAfterDelete = await request("POST", "/api/admin/heartbeat", cookieBeforeDelete);
       record(
         "usuario eliminado: heartbeat técnico también exige la identidad fresca",
         isDirectUnauthorized(heartbeatAfterDelete, "/api/admin/heartbeat"),
         `status=${heartbeatAfterDelete.status} path=${heartbeatAfterDelete.path}`,
       );

       const after = await request("GET", "/api/admin/tags", cookieBeforeDelete);
       record(
         "usuario eliminado: la MISMA cookie da 401 en la primera solicitud posterior (no 403) -- getCurrentAdmin() ya no encuentra la fila",
         isDirectUnauthorized(after, "/api/admin/tags"),
         `status=${after.status} path=${after.path} body=${JSON.stringify(after.body)}`,
       );
    }
  } finally {
    for (const id of Object.values(createdIds)) {
      if (!id) continue;
      try {
        await request("DELETE", `/api/admin/users/${id}`, superadminCookie);
      } catch {
        // best effort
      }
    }
    psqlExec(`delete from admin_users where email like 'synth-stale-%@test.local';`);
    psqlExec(`delete from tags where name like 'Stale Tag%';`);
  }

  console.log("\n== Resumen ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} OK`);
  if (pass !== results.length) {
    for (const r of results) if (!r.pass) console.log(`  - ${r.scenario} :: ${r.notes}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
