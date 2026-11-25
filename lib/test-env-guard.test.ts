// Pruebas automatizadas del guard fail-closed (Fase 4B.2) con el test
// runner nativo de Node (node:test / node:assert). Todos los valores de
// este archivo son ficticios -- ninguna prueba acá abre una conexión real
// a ninguna base, ni local ni de producción; solo manipulan process.env
// en memoria y llaman a una función pura.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { assertLocalSupabaseTestEnv, LOCAL_SUPABASE_URL, TestEnvGuardError } from "./test-env-guard.ts";

// Mismo secreto por defecto que imprime `supabase start` en CUALQUIER
// stack local sin configuración propia -- público y documentado, no es
// un secreto real de este proyecto (ver el mismo valor y comentario en
// test-env-guard.ts). Se usa acá solo para poder firmar JWTs de prueba
// que SÍ verifiquen, sin necesidad de un stack local real corriendo.
const LOCAL_DEFAULT_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

const ENV_KEYS = [
  "SUPABASE_TEST_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_SESSION_SECRET",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

/** JWT con los claims pedidos pero firma inventada (no verifica contra
 * ningún secreto) -- para los casos "los claims mienten" / "la firma no
 * corresponde". Nunca se usa para abrir ninguna conexión real. */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.fake-signature-not-real`;
}

/** JWT con firma HS256 REAL contra el secreto por defecto del stack
 * local -- para los casos "esto debería pasar". Sigue siendo 100%
 * ficticio como credencial (nunca abre ninguna conexión), pero ahora sí
 * verifica, igual que la clave real que imprime `supabase start`. */
function signedLocalJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const signature = createHmac("sha256", LOCAL_DEFAULT_JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

const LOCAL_SHAPED_KEY = signedLocalJwt({ iss: "supabase-demo", role: "service_role", exp: 1983812996 });
const LOCAL_SHAPED_ANON_KEY = signedLocalJwt({ iss: "supabase-demo", role: "anon", exp: 1983812996 });

function setValidLocalEnv() {
  process.env.SUPABASE_TEST_ENV = "local";
  process.env.NEXT_PUBLIC_SUPABASE_URL = LOCAL_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = LOCAL_SHAPED_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = LOCAL_SHAPED_KEY;
  process.env.ADMIN_SESSION_SECRET = "clave-de-prueba-exclusiva-del-entorno-local-ficticia";
}

test("camino normal: sin SUPABASE_TEST_ENV, no hace nada (no le agrega fricción a dev/producción)", () => {
  assert.doesNotThrow(() => assertLocalSupabaseTestEnv());
});

test("configuración completa y consistente: no tira", () => {
  setValidLocalEnv();
  assert.doesNotThrow(() => assertLocalSupabaseTestEnv());
});

test("bloquea un valor de SUPABASE_TEST_ENV distinto de 'local'", () => {
  setValidLocalEnv();
  process.env.SUPABASE_TEST_ENV = "remote";
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una URL de 'producción' (cualquier URL que no sea la local exacta)", () => {
  setValidLocalEnv();
  // Dominio ficticio con forma de proyecto de Supabase Cloud -- nunca se
  // usa para conectar a nada, solo para que el guard la rechace.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://ejemplo-proyecto-ficticio.supabase.co";
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una URL local 'parecida' pero no exacta (otro puerto)", () => {
  setValidLocalEnv();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54399";
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea si falta NEXT_PUBLIC_SUPABASE_URL", () => {
  setValidLocalEnv();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea si falta SUPABASE_SERVICE_ROLE_KEY", () => {
  setValidLocalEnv();
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una clave que no decodifica como JWT (string cualquiera)", () => {
  setValidLocalEnv();
  process.env.SUPABASE_SERVICE_ROLE_KEY = "esto-no-es-un-jwt";
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una clave con forma de JWT pero con 'iss' distinto de supabase-demo (forma de clave de producción/otro proyecto)", () => {
  setValidLocalEnv();
  process.env.SUPABASE_SERVICE_ROLE_KEY = fakeJwt({
    iss: "ejemplo-proyecto-ficticio",
    role: "service_role",
  });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una clave con 'iss' correcto pero rol distinto de service_role (ej. anon)", () => {
  setValidLocalEnv();
  process.env.SUPABASE_SERVICE_ROLE_KEY = fakeJwt({ iss: "supabase-demo", role: "anon" });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

// ── Verificación final: los claims solos no alcanzan, la firma importa ──
test("bloquea una service_role key con los claims EXACTOS pero firma inventada (claims no son prueba de nada)", () => {
  setValidLocalEnv();
  process.env.SUPABASE_SERVICE_ROLE_KEY = fakeJwt({
    iss: "supabase-demo",
    role: "service_role",
    exp: 1983812996,
  });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una anon key con los claims EXACTOS pero firma inventada", () => {
  setValidLocalEnv();
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = fakeJwt({
    iss: "supabase-demo",
    role: "anon",
    exp: 1983812996,
  });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("pasa con una clave firmada de verdad contra el secreto por defecto del stack local (no solo claims correctos)", () => {
  setValidLocalEnv();
  assert.doesNotThrow(() => assertLocalSupabaseTestEnv());
});

test("bloquea si falta NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
  setValidLocalEnv();
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una anon key con 'iss' distinto de supabase-demo (forma de otro proyecto)", () => {
  setValidLocalEnv();
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = fakeJwt({ iss: "ejemplo-proyecto-ficticio", role: "anon" });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una anon key con 'iss' correcto pero rol distinto de anon (ej. service_role pegada por error)", () => {
  setValidLocalEnv();
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = fakeJwt({ iss: "supabase-demo", role: "service_role" });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea si la service_role key es local pero la anon key no corresponde a la misma instancia (mismatch entre las dos)", () => {
  setValidLocalEnv();
  // service_role sigue siendo la local válida; solo la anon se pisa con
  // la forma de otro proyecto -- ninguna de las dos claves "compensa" a
  // la otra.
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = fakeJwt({ iss: "otro-proyecto-ficticio", role: "anon" });
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea si falta ADMIN_SESSION_SECRET", () => {
  setValidLocalEnv();
  delete process.env.ADMIN_SESSION_SECRET;
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("bloquea una combinación inconsistente: URL local correcta pero clave con forma de otro proyecto", () => {
  process.env.SUPABASE_TEST_ENV = "local";
  process.env.NEXT_PUBLIC_SUPABASE_URL = LOCAL_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = fakeJwt({ iss: "otro-proyecto", role: "service_role" });
  process.env.ADMIN_SESSION_SECRET = "algo";
  assert.throws(() => assertLocalSupabaseTestEnv(), TestEnvGuardError);
});

test("nunca cae de vuelta a 'parece que sí' -- cada condición se exige por separado, no basta con alguna", () => {
  // Todo correcto MENOS un solo campo por vez -- confirma que ninguna
  // condición es opcional ni se compensa con que las demás estén bien.
  for (const breakField of ["url", "key", "anon", "secret"] as const) {
    setValidLocalEnv();
    if (breakField === "url") process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9999";
    if (breakField === "key") process.env.SUPABASE_SERVICE_ROLE_KEY = "no-jwt";
    if (breakField === "anon") process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "no-jwt";
    if (breakField === "secret") delete process.env.ADMIN_SESSION_SECRET;
    assert.throws(
      () => assertLocalSupabaseTestEnv(),
      TestEnvGuardError,
      `no debería pasar con "${breakField}" roto`,
    );
  }
});
