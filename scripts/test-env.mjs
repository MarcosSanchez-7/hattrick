// Fase 4B.2 (verificación final) -- punto de entrada OBLIGATORIO del
// entorno de pruebas. Todo comando que necesite Next.js (o, en el futuro,
// cualquier runner de integración) corriendo contra Supabase local debe
// pasar por loadAndAssertTestEnv() de este archivo -- no hay manera de
// arrancar dev:test/build:test/start:test sin invocarlo primero (está
// adentro de cada script, no es un paso aparte que alguien pueda
// olvidarse de correr a mano).
//
// Hace cuatro cosas, en este orden, todo ANTES de que el caller arranque
// cualquier proceso de Next:
//   1. Falla si .env.test.local no existe.
//   2. Falla si existen .env o .env.test en la raíz del proyecto -- con
//      NODE_ENV=test, el propio cargador de Next (@next/env) agrega esos
//      dos nombres a la lista de archivos que lee de disco, *además* de
//      .env.test.local. Confirmado en esta verificación: una clave que
//      .env.test.local no mencione (ni siquiera vacía) y que SÍ esté en
//      uno de esos dos archivos llega igual al proceso -- el allowlist de
//      buildIsolatedTestEnv solo controla lo heredado del proceso padre,
//      no lo que Next lee de un archivo nuevo en disco. Ante la duda, se
//      falla en vez de intentar adivinar qué claves de un archivo
//      inesperado son "seguras".
//   3. Arma el entorno aislado (lib/test-env-loader.ts -- descarta todo lo
//      que el proceso padre tuviera exportado salvo lo estrictamente
//      necesario para que Node/Next funcionen, nunca nada de aplicación).
//   4. Corre el guard (lib/test-env-guard.ts) contra ESE entorno armado,
//      no contra process.env -- si falla, nunca llega a tocarse el
//      proceso actual ni a arrancar nada.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  parseEnvFile,
  buildIsolatedTestEnv,
  TestEnvFileError,
} from "../lib/test-env-loader.ts";
import { assertLocalSupabaseTestEnv, TestEnvGuardError } from "../lib/test-env-guard.ts";

export function loadAndAssertTestEnv({ cwd = process.cwd() } = {}) {
  const envPath = path.resolve(cwd, ".env.test.local");
  if (!existsSync(envPath)) {
    console.error(
      `[test-env] Falta ${envPath} -- no se puede continuar sin él.\n` +
        `[test-env] Generalo con: npm run test:env:generate (requiere Supabase local ya corriendo con "npm run supabase:start").`,
    );
    process.exit(1);
  }

  // Con NODE_ENV=test, @next/env carga [.env.test.local, .env.test, .env]
  // -- un .env o .env.test sueltos en la raíz podrían meter claves que
  // .env.test.local nunca mencionó (ver comentario de arriba). Se
  // rechaza la presencia de cualquiera de los dos, sin intentar leerlos
  // ni fusionarlos.
  for (const strayName of [".env", ".env.test"]) {
    const strayPath = path.resolve(cwd, strayName);
    if (existsSync(strayPath)) {
      console.error(
        `[test-env] Encontrado ${strayPath} -- con NODE_ENV=test, Next lo carga junto a .env.test.local ` +
          `y podría introducir claves que este aislamiento no controla. Movelo o borralo antes de correr ` +
          `un comando de prueba.`,
      );
      process.exit(1);
    }
  }

  const content = readFileSync(envPath, "utf8");
  const parsedFile = parseEnvFile(content);

  try {
    const env = buildIsolatedTestEnv(process.env, parsedFile);
    assertLocalSupabaseTestEnv(env);
    return env;
  } catch (err) {
    if (err instanceof TestEnvFileError || err instanceof TestEnvGuardError) {
      console.error(`[test-env] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}
