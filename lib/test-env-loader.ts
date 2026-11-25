// Fase 4B.2 (verificación final) -- lógica pura del aislamiento de
// variables de entorno para los comandos de prueba. Sin "server-only"
// (mismo motivo que lib/test-env-guard.ts): lo usan scripts/*.mjs fuera
// del runtime de Next, y los propios tests con node --test puro. Sin
// tocar el sistema de archivos acá a propósito -- eso lo hace el script
// que llama a esto (scripts/test-env.mjs), así esta lógica se puede
// probar con strings en memoria, nunca contra un archivo real.

export class TestEnvFileError extends Error {}

/** Nombre y valor de cada línea "CLAVE=valor" de un archivo .env simple
 * (comillas simples/dobles opcionales, líneas vacías y "#..." ignoradas).
 * Deliberadamente simple -- mismo formato que ya escribe .env.test.local,
 * no soporta interpolación ni multilínea (no los necesita). */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Lo mínimo que un proceso de Node/Next necesita para funcionar en Windows
 * (resolución de comandos, rutas temporales, home del usuario) -- nunca
 * nada de nivel aplicación. Todo lo demás que el proceso padre (la
 * terminal del desarrollador, una CI) tenga exportado se descarta por
 * completo al construir el entorno de pruebas -- no alcanza con que el
 * archivo .env.test.local "gane" si ya está definido; una variable de
 * aplicación que el padre tuviera exportada y que .env.test.local no
 * mencione NUNCA debe poder llegar al proceso de prueba. Ver el hallazgo
 * de esta fase sobre cómo @next/env decide si una key ya "existe".
 */
export const SAFE_INHERITED_ENV_KEYS = [
  "PATH",
  "Path",
  "SystemRoot",
  "SystemDrive",
  "windir",
  "WINDIR",
  "TEMP",
  "TMP",
  "USERPROFILE",
  "USERNAME",
  "HOMEDRIVE",
  "HOMEPATH",
  "APPDATA",
  "LOCALAPPDATA",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "ProgramData",
  "ComSpec",
  "PATHEXT",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "OS",
  // POSIX (CI/WSL/futuro despliegue no-Windows de este mismo script):
  "HOME",
  "LANG",
  "LC_ALL",
  "SHELL",
  "TERM",
] as const;

/** El archivo de entorno de pruebas DEBE declarar SUPABASE_TEST_ENV=local
 * él mismo -- no alcanza con que algo más arriba en el proceso ya lo
 * tuviera seteado. Sin esto, un .env.test.local editado a mano que se
 * olvidó esta línea pasaría desapercibido en vez de fallar fuerte. */
export function requireTestMarkerInFile(parsedFile: Record<string, string>): void {
  if (parsedFile.SUPABASE_TEST_ENV !== "local") {
    throw new TestEnvFileError(
      'El archivo de entorno de pruebas debe declarar SUPABASE_TEST_ENV=local por sí mismo ' +
        `(no alcanza con heredarlo de otro lado). Valor encontrado: ${
          parsedFile.SUPABASE_TEST_ENV ? `"${parsedFile.SUPABASE_TEST_ENV}"` : "(ausente)"
        }.`,
    );
  }
}

/**
 * Arma el entorno COMPLETO del proceso de prueba desde cero: solo las
 * claves de SAFE_INHERITED_ENV_KEYS que el proceso padre tenga, más
 * NODE_ENV="test" (hace que el propio loader de variables de Next
 * EXCLUYA .env.local de su carga automática -- ver @next/env,
 * confirmado leyendo node_modules/@next/env/dist/index.js: cuando
 * NODE_ENV==="test", la lista de archivos que Next intenta cargar es
 * [.env.test.local, .env.test, .env] -- ".env.local" queda afuera del
 * arreglo directamente, no solo "no pisa lo ya definido"), más TODO el
 * contenido de .env.test.local. Ninguna otra variable del proceso padre
 * sobrevive -- ni siquiera si .env.test.local "se olvidó" de mencionarla.
 */
export function buildIsolatedTestEnv(
  parentEnv: Record<string, string | undefined>,
  parsedTestFile: Record<string, string>,
): Record<string, string> {
  requireTestMarkerInFile(parsedTestFile);

  const isolated: Record<string, string> = {};
  for (const key of SAFE_INHERITED_ENV_KEYS) {
    const value = parentEnv[key];
    if (value !== undefined) isolated[key] = value;
  }
  isolated.NODE_ENV = "test";
  Object.assign(isolated, parsedTestFile);
  return isolated;
}
