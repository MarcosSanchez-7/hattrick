// Sin "server-only" a propósito: lo importa instrumentation.ts (que corre
// antes de que Next empiece a atender requests, fuera de cualquier Server
// Component) y, por separado, scripts/test-env.mjs (fuera del runtime de
// Next por completo) -- ninguno de los dos contextos es un Client
// Component, pero tampoco pasan por el bundler de Next, así que
// "server-only" (que depende de ese bundler para funcionar) rompería este
// módulo con un error sin relación alguna al entorno real (ver el mismo
// motivo documentado en lib/revalidate-core.ts).
//
// Fase 4B.2 -- guard fail-closed: nada de esto se ejecuta en el camino
// normal (dev/producción contra Supabase Cloud). Solo entra en juego
// cuando algo puso SUPABASE_TEST_ENV en el ambiente -- y en ese caso, se
// vuelve estricto: cualquier inconsistencia frena todo antes de que se
// pueda crear un cliente de Supabase o ejecutar una escritura.

import { createHmac, timingSafeEqual } from "node:crypto";

export class TestEnvGuardError extends Error {}

/** Puerto por defecto de la API de Supabase local (ver supabase/config.jsonc,
 * api.port) -- URL exacta, no un patrón "parece local" (127.0.0.1 a
 * secas también podría ser otra cosa corriendo en la misma máquina). */
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

/** Secreto por defecto que `supabase start` usa para firmar las claves
 * ANON_KEY/SERVICE_ROLE_KEY de CUALQUIER stack local sin configuración
 * propia (impreso tal cual por la CLI, documentado públicamente -- no es
 * un secreto real de este proyecto). Verificación final de esta fase:
 * los claims de un JWT (iss/role) se pueden escribir a mano sin tener la
 * clave real -- decodificarlos NO prueba que la clave sea genuinamente
 * local, solo que TIENE ESA FORMA. Verificar la firma contra este secreto
 * sí prueba algo real: una clave de producción está firmada con el
 * secreto propio (al azar) de ESE proyecto, nunca con este -- jamás va a
 * verificar acá, sin importar qué claims lleve adentro. */
const LOCAL_DEFAULT_JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

type EnvLike = Record<string, string | undefined>;

/** Decodifica el payload de un JWT sin verificar nada todavía -- solo
 * para poder mirar los claims antes de decidir si vale la pena verificar
 * la firma (ver verifyLocalJwtSignature, que es la comprobación que
 * realmente importa). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json);
    return typeof payload === "object" && payload !== null ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Verifica que el JWT esté FIRMADO (HS256) con el secreto por defecto del
 * stack local -- no solo que sus claims digan lo que uno esperaría. Una
 * clave de producción real nunca pasa esto: está firmada con el secreto
 * propio y aleatorio de ese proyecto, no con el default de un stack
 * local. `timingSafeEqual` en vez de comparar strings directo -- mismo
 * motivo que lib/admin-auth.ts al verificar contraseñas.
 */
function verifyLocalJwtSignature(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = createHmac("sha256", LOCAL_DEFAULT_JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    actual = Buffer.from(signatureB64, "base64url");
  } catch {
    return false;
  }
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Punto único de entrada. Si SUPABASE_TEST_ENV no está definida, es el
 * camino normal (dev o producción contra Supabase Cloud) -- no hace nada,
 * no le agrega fricción a eso. En cuanto SUPABASE_TEST_ENV existe, deja de
 * haber beneficio de la duda: cada condición debe cumplirse exactamente o
 * tira -- nunca sigue adelante "total, parece que sí" (fail-closed, no
 * fail-open). Nunca cae de vuelta a ninguna credencial de producción por
 * su cuenta: si algo no se puede confirmar como local, se detiene.
 *
 * Acepta un objeto de entorno opcional (por defecto process.env) -- así
 * scripts/test-env.mjs puede validar el entorno que está armando ANTES de
 * aplicarlo a ningún proceso real (ni el propio, ni el que todavía no
 * arrancó), sin el ir-y-volver de mutar process.env solo para poder
 * llamar a esta función y después deshacerlo.
 */
export function assertLocalSupabaseTestEnv(env: EnvLike = process.env): void {
  const testEnv = env.SUPABASE_TEST_ENV;
  if (testEnv === undefined) return;

  if (testEnv !== "local") {
    throw new TestEnvGuardError(
      `SUPABASE_TEST_ENV="${testEnv}" no es un valor autorizado -- el único valor válido es "local". ` +
        `Si no se quiso activar el entorno de pruebas, no definas esta variable.`,
    );
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (url !== LOCAL_SUPABASE_URL) {
    throw new TestEnvGuardError(
      `NEXT_PUBLIC_SUPABASE_URL debe ser exactamente "${LOCAL_SUPABASE_URL}" cuando SUPABASE_TEST_ENV=local ` +
        `(coincidencia exacta, no "parece local"). Valor actual: ${url ? `"${url}"` : "(sin definir)"}.`,
    );
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new TestEnvGuardError(
      "Falta SUPABASE_SERVICE_ROLE_KEY con SUPABASE_TEST_ENV=local.",
    );
  }
  const payload = decodeJwtPayload(serviceRoleKey);
  if (payload?.["iss"] !== "supabase-demo" || payload?.["role"] !== "service_role") {
    throw new TestEnvGuardError(
      'SUPABASE_SERVICE_ROLE_KEY no tiene la forma de la clave local de Supabase ' +
        '(se espera "iss":"supabase-demo" y "role":"service_role" en el payload del JWT) -- ' +
        "nunca se avanza con una clave que no se pueda confirmar como local, aunque la URL sí lo sea.",
    );
  }
  // Los claims solos no prueban nada -- se pueden escribir a mano sin la
  // clave real. Se exige además que la firma verifique contra el secreto
  // por defecto del stack local (ver verifyLocalJwtSignature): una clave
  // de producción, aunque alguien le copiara los claims exactos, nunca va
  // a estar firmada con este secreto.
  if (!verifyLocalJwtSignature(serviceRoleKey)) {
    throw new TestEnvGuardError(
      "SUPABASE_SERVICE_ROLE_KEY tiene los claims correctos pero su firma no corresponde al secreto " +
        "por defecto del stack local -- los claims de un JWT se pueden escribir a mano sin tener la " +
        "clave real, así que no alcanzan solos. Nunca se avanza con una clave que no verifique.",
    );
  }

  // La clave pública (anon) también viaja al navegador -- si quedara
  // apuntando a un proyecto real por error (mismatch entre las dos
  // claves, ej. alguien pegó la anon de producción a mano), cualquier
  // página pública empezaría a filtrar esa clave real al cliente aunque
  // el service_role sí fuera el local. Se exige la misma forma
  // (iss=supabase-demo, role=anon) -- no alcanza con que una de las dos
  // claves esté bien.
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new TestEnvGuardError(
      "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY con SUPABASE_TEST_ENV=local.",
    );
  }
  const anonPayload = decodeJwtPayload(anonKey);
  if (anonPayload?.["iss"] !== "supabase-demo" || anonPayload?.["role"] !== "anon") {
    throw new TestEnvGuardError(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY no tiene la forma de la clave local de Supabase ' +
        '(se espera "iss":"supabase-demo" y "role":"anon" en el payload del JWT).',
    );
  }
  if (!verifyLocalJwtSignature(anonKey)) {
    throw new TestEnvGuardError(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY tiene los claims correctos pero su firma no corresponde al secreto " +
        "por defecto del stack local -- mismo motivo que SUPABASE_SERVICE_ROLE_KEY: los claims solos no prueban nada.",
    );
  }

  if (!env.ADMIN_SESSION_SECRET) {
    throw new TestEnvGuardError(
      "Falta ADMIN_SESSION_SECRET exclusivo del entorno de pruebas con SUPABASE_TEST_ENV=local.",
    );
  }
}
