// Pruebas automatizadas del aislamiento de variables (Fase 4B.2,
// verificación final) con el test runner nativo de Node. Todo en memoria,
// ningún valor real, ninguna conexión -- esto prueba la lógica pura de
// lib/test-env-loader.ts, no el script de I/O que la envuelve.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEnvFile,
  requireTestMarkerInFile,
  buildIsolatedTestEnv,
  TestEnvFileError,
  SAFE_INHERITED_ENV_KEYS,
} from "./test-env-loader.ts";

test("parseEnvFile: lee pares CLAVE=valor, ignora comentarios y líneas vacías", () => {
  const parsed = parseEnvFile(
    "# comentario\n\nSUPABASE_TEST_ENV=local\nVACIA=\nOTRA = con espacios \n",
  );
  assert.deepEqual(parsed, {
    SUPABASE_TEST_ENV: "local",
    VACIA: "",
    OTRA: "con espacios",
  });
});

test("parseEnvFile: saca comillas simples/dobles que envuelven el valor completo", () => {
  const parsed = parseEnvFile(`A="hola"\nB='mundo'\nC=sin-comillas`);
  assert.deepEqual(parsed, { A: "hola", B: "mundo", C: "sin-comillas" });
});

// ── Marcador de pruebas ausente en el ARCHIVO (no alcanza con que el
//    proceso ya lo tuviera puesto por otro lado) ───────────────────────
test("requireTestMarkerInFile: tira si el archivo no declara SUPABASE_TEST_ENV=local", () => {
  assert.throws(() => requireTestMarkerInFile({}), TestEnvFileError);
  assert.throws(
    () => requireTestMarkerInFile({ SUPABASE_TEST_ENV: "remote" }),
    TestEnvFileError,
  );
});

test("requireTestMarkerInFile: pasa si el archivo declara exactamente SUPABASE_TEST_ENV=local", () => {
  assert.doesNotThrow(() => requireTestMarkerInFile({ SUPABASE_TEST_ENV: "local" }));
});

// ── Variables heredadas no autorizadas ──────────────────────────────────
test("buildIsolatedTestEnv: una variable de aplicación del proceso padre (no en el allowlist ni en el archivo) NUNCA llega al entorno de prueba", () => {
  const parentEnv = {
    PATH: "/usr/bin",
    // Secreto ficticio de ejemplo, como si el padre lo tuviera exportado
    // (una terminal, una CI) -- nunca debe sobrevivir al aislamiento.
    UPSTASH_REDIS_REST_TOKEN: "token-de-produccion-ficticio-nunca-debe-sobrevivir",
    OTRA_VARIABLE_DE_APLICACION: "algo-sensible-ficticio",
  };
  const parsedFile = { SUPABASE_TEST_ENV: "local", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" };

  const result = buildIsolatedTestEnv(parentEnv, parsedFile);

  assert.equal(result.UPSTASH_REDIS_REST_TOKEN, undefined);
  assert.equal(result.OTRA_VARIABLE_DE_APLICACION, undefined);
  // Lo que SÍ está permitido heredar (PATH) sigue presente.
  assert.equal(result.PATH, "/usr/bin");
  // Lo del archivo se aplica igual.
  assert.equal(result.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:54321");
});

test("buildIsolatedTestEnv: solo pasan las claves de SAFE_INHERITED_ENV_KEYS desde el padre", () => {
  const parentEnv: Record<string, string> = { SECRETO_INVENTADO: "no-debe-pasar" };
  for (const key of SAFE_INHERITED_ENV_KEYS) parentEnv[key] = `valor-${key}`;

  const result = buildIsolatedTestEnv(parentEnv, { SUPABASE_TEST_ENV: "local" });

  for (const key of SAFE_INHERITED_ENV_KEYS) {
    assert.equal(result[key], `valor-${key}`, `se esperaba heredar ${key}`);
  }
  assert.equal(result.SECRETO_INVENTADO, undefined);
});

test("buildIsolatedTestEnv: siempre fuerza NODE_ENV=test (hace que Next excluya .env.local de su carga automática)", () => {
  const result = buildIsolatedTestEnv({ NODE_ENV: "production" }, { SUPABASE_TEST_ENV: "local" });
  assert.equal(result.NODE_ENV, "test");
});

test("buildIsolatedTestEnv: el archivo puede sobreescribir incluso una clave del allowlist heredada", () => {
  const result = buildIsolatedTestEnv(
    { TEMP: "/tmp-del-padre" },
    { SUPABASE_TEST_ENV: "local", TEMP: "/tmp-de-prueba" },
  );
  assert.equal(result.TEMP, "/tmp-de-prueba");
});

test("buildIsolatedTestEnv: tira (vía requireTestMarkerInFile) si el archivo no trae el marcador, antes de armar nada", () => {
  assert.throws(
    () => buildIsolatedTestEnv({ PATH: "/usr/bin" }, { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" }),
    TestEnvFileError,
  );
});

test("buildIsolatedTestEnv: un archivo vacío (sin ninguna clave) también tira por el marcador faltante", () => {
  assert.throws(() => buildIsolatedTestEnv({}, {}), TestEnvFileError);
});
