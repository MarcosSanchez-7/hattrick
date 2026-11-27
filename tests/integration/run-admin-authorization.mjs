// Fase 8B.2 -- pruebas de integración REALES de la matriz de autorización
// administrativa (editor/viewer/vendedor/superadmin) contra el servidor de
// producción aislado (build:test/start:test, puerto 3100) y Supabase local.
// Mismo contrato que el resto de tests/integration (guard obligatorio, ver
// isr-invalidation.mjs) -- NO se importan sus helpers porque este archivo
// necesita varias sesiones simultáneas (una por rol), no una sola global.
//
// Requiere, antes de correr este archivo:
//   npm run supabase:reset   (opcional, pero deja un estado conocido)
//   npm run build:test
//   npm run start:test       (en otro proceso, puerto 3100)
import { loadAndAssertTestEnv } from "../../scripts/test-env.mjs";
import { execFileSync } from "node:child_process";

const env = loadAndAssertTestEnv();
const BASE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

function psqlExec(sql) {
  execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login falló para ${email}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie");
  return setCookie.split(";")[0];
}

async function request(method, path, cookie, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

const results = [];
function record(scenario, pass, notes) {
  results.push({ scenario, pass, notes });
  console.log(`[${pass ? "OK  " : "FAIL"}] ${scenario}${notes ? ` -- ${notes}` : ""}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Setup: usuarios sintéticos de cada rol ──────────────────────────────

const SUPERADMIN = { email: "admin@test.local", password: "TestAdmin123!" };
const SYNTH_PASSWORD = "Synth8B2Pass!";
const SYNTH_USERS = [
  { role: "editor", email: "synth-editor-8b2@test.local", name: "Synth Editor 8B2" },
  { role: "viewer", email: "synth-viewer-8b2@test.local", name: "Synth Viewer 8B2" },
  { role: "vendedor", email: "synth-vendedor-8b2@test.local", name: "Synth Vendedor 8B2" },
];

const cookies = {};
const createdUserIds = [];

async function setup() {
  // Limpieza de una corrida anterior interrumpida, por si quedó algo.
  for (const u of SYNTH_USERS) {
    psqlExec(`delete from admin_users where email = '${u.email}';`);
  }

  cookies.superadmin = await login(SUPERADMIN.email, SUPERADMIN.password);

  for (const u of SYNTH_USERS) {
    const res = await request("POST", "/api/admin/users", cookies.superadmin, {
      name: u.name,
      email: u.email,
      password: SYNTH_PASSWORD,
      role: u.role,
    });
    assert(res.status === 201, `no se pudo crear el usuario sintético ${u.role}: ${JSON.stringify(res.body)}`);
    createdUserIds.push(res.body.id);
    cookies[u.role] = await login(u.email, SYNTH_PASSWORD);
  }
}

async function teardown() {
  for (const id of createdUserIds) {
    try {
      await request("DELETE", `/api/admin/users/${id}`, cookies.superadmin);
    } catch {
      // best effort
    }
  }
  for (const u of SYNTH_USERS) {
    psqlExec(`delete from admin_users where email = '${u.email}';`);
  }

  // Los POST de la matriz (ejecutados por los roles que SÍ tienen el
  // permiso -- superadmin y a veces editor) crean filas reales con el
  // prefijo "synth-8b2"/"Synth ..." -- limpiarlas siempre, incluso si la
  // corrida falló a mitad de camino (por eso va en el `finally` de main()).
  // El slug puede haberse auto-desambiguado (ej. "synth-8b2-cat-2") si dos
  // roles con permiso intentaron crear el mismo slug -- el "like" cubre eso.
  psqlExec(`delete from products where slug like 'synth-8b2%';`);
  psqlExec(`delete from categories where slug like 'synth-8b2%';`);
  psqlExec(`delete from tags where name like 'Synth Tag%';`);
  psqlExec(`delete from patches where name like 'Synth patch%';`);
  psqlExec(`delete from pages where slug like 'synth-8b2%';`);
  psqlExec(`delete from qr_campaigns where slug like 'synth-8b2%';`);
  psqlExec(`delete from crm_customers where name like 'Synth Customer%';`);
  psqlExec(`delete from suppliers where name like 'Synth Supplier%';`);
}

// ── Matriz de endpoints protegidos (permiso real por método) ───────────
// Cuerpos VÁLIDOS de verdad (no vacíos) para que un 403 nunca pueda
// confundirse con un rechazo de validación -- ver instrucción del
// propietario ("entradas válidas para evitar falsos positivos").

const ENDPOINTS = [
  { method: "GET", path: "/api/admin/categories", permission: "categories.read" },
  { method: "POST", path: "/api/admin/categories", permission: "categories.write", body: { slug: "synth-8b2-cat", name: "Synth 8B2", tagline: "x", description: "x" } },
  { method: "GET", path: "/api/admin/categories/test-futbol", permission: "categories.read" },
  { method: "PUT", path: "/api/admin/categories/test-futbol", permission: "categories.write", body: { name: "Fútbol", tagline: "x", description: "x" } },
  { method: "PATCH", path: "/api/admin/categories/test-futbol", permission: "categories.write", body: { isVisible: true } },

  { method: "GET", path: "/api/admin/patches", permission: "patches.read" },
  { method: "POST", path: "/api/admin/patches", permission: "patches.write", body: { name: "Synth patch 8B2", price: 1000 } },
  { method: "PUT", path: "/api/admin/patches/patch-test-oculto", permission: "patches.write", body: { name: "Parche Test Oculto", price: 1000 } },

  { method: "GET", path: "/api/admin/tags", permission: "tags.read" },
  { method: "POST", path: "/api/admin/tags", permission: "tags.write", body: { name: "Synth Tag 8B2", color: "#111111" } },
  { method: "PUT", path: `/api/admin/tags/${encodeURIComponent("Versión Jugador")}`, permission: "tags.write", body: { color: "#222222" } },

  { method: "GET", path: "/api/admin/inventory/movements", permission: "inventory.movements.read" },
  { method: "POST", path: "/api/admin/inventory/movements", permission: "inventory.write", body: { variantId: "pv-test-agotado-m", mode: "restock", quantity: 0, note: "synth 8b2 noop" } },

  { method: "GET", path: "/api/admin/pages", permission: "pages.read" },
  { method: "POST", path: "/api/admin/pages", permission: "pages.write", body: { slug: "synth-8b2-page", title: "Synth 8B2", body: "x", placement: "footer_legal" } },
  { method: "GET", path: "/api/admin/pages/terminos", permission: "pages.read" },
  { method: "PUT", path: "/api/admin/pages/terminos", permission: "pages.write", body: { title: "Términos y Condiciones", body: "x", placement: "footer_legal" } },

  { method: "GET", path: "/api/admin/qr-campaigns", permission: "qr.read" },
  { method: "POST", path: "/api/admin/qr-campaigns", permission: "qr.write", body: { name: "Synth 8B2", slug: "synth-8b2-qr" } },

  { method: "GET", path: "/api/admin/products", permission: "products.read" },
  { method: "POST", path: "/api/admin/products", permission: "products.write", body: { slug: "synth-8b2-prod", name: "Synth 8B2", category: "test-futbol", price: 1000, colors: { primary: "#000", secondary: "#fff", accent: "#000" }, pattern: "solid", description: "x", stockMode: "ajeno" } },
  { method: "GET", path: "/api/admin/products/p-test-oculto", permission: "products.read" },
  { method: "PATCH", path: "/api/admin/products/p-test-oculto", permission: "products.write", body: { isVisible: false } },

  { method: "GET", path: "/api/admin/customers", permission: "customers.read" },
  { method: "POST", path: "/api/admin/customers", permission: "customers.write", body: { name: "Synth Customer 8B2", phone: "+595900000000" } },

  { method: "GET", path: "/api/admin/sales", permission: "sales.read" },
  { method: "POST", path: "/api/admin/sales", permission: "sales.write", body: { channel: "web", items: [] } },
  { method: "GET", path: "/api/admin/sales/export", permission: "sales.export" },
  { method: "POST", path: "/api/admin/sales/import", permission: "sales.import", isFormData: true },

  { method: "GET", path: "/api/admin/suppliers", permission: "suppliers.read" },
  { method: "POST", path: "/api/admin/suppliers", permission: "suppliers.write", body: { name: "Synth Supplier 8B2" } },

  { method: "GET", path: "/api/admin/settings/hero", permission: "settings.write" },
  { method: "PUT", path: "/api/admin/settings/hero", permission: "settings.write", body: { title: "x", subtitle: "x", ctaLabel: "x", ctaHref: "/", stats: [] } },

  { method: "POST", path: "/api/admin/upload", permission: "uploads.write", body: {} },

  { method: "GET", path: "/api/admin/finance/accounts", permission: "finance.access" },
  { method: "GET", path: "/api/admin/users", permission: "users.manage" },
];

const ALL_ROLES = ["superadmin", "editor", "viewer", "vendedor"];

function hasPermissionExpected(role, permission) {
  // Copia mínima de la matriz real (lib/admin-auth.ts) -- se valida por
  // separado contra el código real en lib/admin-auth.test.ts; acá solo se
  // usa para saber qué esperar de CADA combinación real contra el server.
  const MATRIX = {
    superadmin: null, // "*"
    editor: new Set([
      "products.read", "products.write", "categories.read", "categories.write",
      "patches.read", "patches.write", "tags.read", "tags.write",
      "inventory.read", "inventory.movements.read", "inventory.write", "pages.read", "pages.write",
      "qr.read", "qr.write", "sales.read", "sales.write",
      "customers.read", "customers.write", "suppliers.read", "uploads.write",
    ]),
    viewer: new Set(["products.read", "categories.read", "patches.read", "tags.read", "inventory.read", "pages.read", "qr.read"]),
    vendedor: new Set([]),
  };
  if (role === "superadmin") return true;
  return MATRIX[role].has(permission);
}

async function runMatrix() {
  for (const ep of ENDPOINTS) {
    for (const role of ALL_ROLES) {
      const expectedAllowed = hasPermissionExpected(role, ep.permission);
      const label = `${ep.method} ${ep.path} como ${role} (permiso ${ep.permission})`;

      if (ep.isFormData) {
        // sales/import espera multipart -- probarlo con JSON alcanza para
        // confirmar el 401/403 (se decide ANTES de leer el form), pero no
        // se puede afirmar éxito con este cuerpo -- se marca informativo.
        const res = await fetch(`${BASE_URL}${ep.path}`, { method: ep.method, headers: { Cookie: cookies[role] } });
        if (!expectedAllowed) {
          const pass = res.status === 403;
          record(label, pass, `status=${res.status}`);
        } else {
          const pass = res.status !== 401 && res.status !== 403;
          record(label, pass, `status=${res.status} (no se valida éxito de importación acá, ver run-scenarios.mjs)`);
        }
        continue;
      }

      const res = await request(ep.method, ep.path, cookies[role], ep.body);
      if (!expectedAllowed) {
        const pass = res.status === 403;
        record(label, pass, `esperado 403, status=${res.status} body=${JSON.stringify(res.body).slice(0, 120)}`);
      } else {
        const pass = res.status !== 401 && res.status !== 403;
        record(label, pass, `status=${res.status}`);
      }
    }
  }

  // Sin sesión en absoluto -- 401 para TODO endpoint protegido, sin excepción.
  for (const ep of ENDPOINTS) {
    if (ep.isFormData) continue;
    const res = await request(ep.method, ep.path, null, ep.body);
    record(`${ep.method} ${ep.path} sin sesión`, res.status === 401, `status=${res.status}`);
  }
}

// ── Ausencia de cambios en base de datos ante una operación denegada ────

async function runNoMutationChecks() {
  const before = psql("select count(*) from categories;");
  const res = await request("POST", "/api/admin/categories", cookies.viewer, {
    slug: "viewer-no-deberia-crear-esto",
    name: "x",
    tagline: "x",
    description: "x",
  });
  const after = psql("select count(*) from categories;");
  record(
    "viewer no puede crear una categoría -- ni la fila ni la respuesta de éxito aparecen",
    res.status === 403 && before === after,
    `status=${res.status} before=${before} after=${after}`,
  );

  const beforeTag = psql(`select color from tags where name = 'Versión Jugador';`);
  const resTag = await request("PUT", `/api/admin/tags/${encodeURIComponent("Versión Jugador")}`, cookies.viewer, {
    color: "#ff00ff",
  });
  const afterTag = psql(`select color from tags where name = 'Versión Jugador';`);
  record(
    "viewer no puede editar una etiqueta -- el color real en la base no cambia",
    resTag.status === 403 && beforeTag === afterTag,
    `status=${resTag.status} before=${beforeTag} after=${afterTag}`,
  );

  const protectedTagName = "Synth Protected Delete 8B2";
  const createProtectedTag = await request("POST", "/api/admin/tags", cookies.superadmin, {
    name: protectedTagName,
    color: "#123456",
  });
  assert(createProtectedTag.status === 201, `no se pudo crear el recurso para DELETE denegado: ${JSON.stringify(createProtectedTag.body)}`);
  try {
    const beforeDelete = psql(`select name || ':' || color from tags where name = '${protectedTagName}';`);
    const deniedDelete = await request(
      "DELETE",
      `/api/admin/tags/${encodeURIComponent(protectedTagName)}`,
      cookies.viewer,
    );
    const afterDelete = psql(`select name || ':' || color from tags where name = '${protectedTagName}';`);
    record(
      "viewer no puede eliminar una etiqueta existente y válida -- la fila completa queda intacta",
      deniedDelete.status === 403 && beforeDelete === afterDelete && afterDelete.includes("#123456"),
      `status=${deniedDelete.status} before=${beforeDelete} after=${afterDelete}`,
    );
  } finally {
    await request("DELETE", `/api/admin/tags/${encodeURIComponent(protectedTagName)}`, cookies.superadmin);
  }

  const beforeProduct = psql(`select is_visible from products where id = 'p-test-oculto';`);
  const resProduct = await request("PATCH", "/api/admin/products/p-test-oculto", cookies.editor, {
    isVisible: false,
  });
  // editor SÍ puede -- esto es una prueba positiva de control, para
  // confirmar que el mismo mecanismo de verificación no bloquea de más.
  record(
    "editor SÍ puede cambiar visibilidad de un producto (control positivo)",
    resProduct.status === 200,
    `status=${resProduct.status} before=${beforeProduct}`,
  );
  // Restaura el valor real si hizo falta.
  if (beforeProduct !== "f") {
    await request("PATCH", "/api/admin/products/p-test-oculto", cookies.superadmin, { isVisible: beforeProduct === "t" });
  }
}

async function main() {
  console.log(`\n== Fase 8B.2 -- matriz de autorización administrativa contra ${BASE_URL} ==\n`);
  await setup();
  try {
    await runMatrix();
    await runNoMutationChecks();
  } finally {
    await teardown();
  }

  console.log("\n== Resumen ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} OK`);
  if (pass !== results.length) {
    console.log("\nFallas:");
    for (const r of results) if (!r.pass) console.log(`  - ${r.scenario} :: ${r.notes}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
