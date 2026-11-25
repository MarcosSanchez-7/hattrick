// Fase 4B.3 -- pruebas de integración REALES de invalidación ISR contra
// Supabase local + el servidor de producción aislado (build:test/
// start:test, puerto 3100). No es parte de `npm test` (node --test
// lib/*.test.ts) a propósito: esto necesita el servidor y la base
// corriendo de verdad, no son pruebas unitarias puras.
//
// Requiere, antes de correr este archivo:
//   npm run supabase:reset
//   npm run build:test
//   npm run start:test   (en otra terminal/proceso, puerto 3100)
//
// Ejecuta el guard fail-closed ANTES de hacer ninguna escritura -- mismo
// punto de entrada obligatorio que dev:test/build:test/start:test (ver
// scripts/test-env.mjs), así este script nunca puede terminar
// escribiéndole por error a producción.
import { loadAndAssertTestEnv } from "../../scripts/test-env.mjs";
import { execFileSync } from "node:child_process";

const env = loadAndAssertTestEnv();
const BASE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

// ── Utilidades ──────────────────────────────────────────────────────────

function psql(sql) {
  const out = execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  );
  return out.trim();
}

function psqlExec(sql) {
  execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
}

let sessionCookie = null;

async function login() {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.local", password: "TestAdmin123!" }),
  });
  if (!res.ok) throw new Error(`Login falló: ${res.status}`);
  const setCookie = res.headers.get("set-cookie");
  sessionCookie = setCookie.split(";")[0];
}

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
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

/** Igual que `api`, pero para multipart/form-data (ej. la importación CSV
 * de ventas) -- sin Content-Type explícito, fetch lo completa solo con el
 * boundary correcto a partir del FormData. */
async function apiForm(method, path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Cookie: sessionCookie },
    body: formData,
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

/** GET público -- sin cookie, como un visitante real. Devuelve status,
 * el header x-nextjs-cache (HIT/MISS/STALE/REVALIDATED/undefined) y el
 * HTML completo. */
async function fetchPublic(path) {
  const res = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
  const body = res.status < 400 ? await res.text() : "";
  return { status: res.status, cache: res.headers.get("x-nextjs-cache"), body };
}

function now() {
  return Date.now();
}

const results = [];
function record(entry) {
  results.push(entry);
  const tag = entry.pass ? "OK  " : "FAIL";
  console.log(
    `[${tag}] ${entry.scenario} -- ${entry.route ?? ""} (${entry.ms ?? "?"}ms) ${entry.notes ?? ""}`,
  );
}

/** Espera acotada (polling, no un sleep fijo) hasta que `check()` sea
 * true o se agote el presupuesto -- usado solo para los pocos casos donde
 * la regeneración no es garantizadamente sincrónica con la respuesta del
 * endpoint admin (ninguno en esta app, pero se deja listo y documentado
 * en vez de asumirlo sin más). */
async function waitUntil(check, { timeoutMs = 5000, intervalMs = 200 } = {}) {
  const start = now();
  while (now() - start < timeoutMs) {
    if (await check()) return now() - start;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return -1;
}

export {
  BASE_URL,
  psql,
  psqlExec,
  login,
  api,
  apiForm,
  fetchPublic,
  now,
  results,
  record,
  waitUntil,
};
