// Fase 4B.2 -- genera .env.test.local desde cero, leyendo las credenciales
// LOCALES reales impresas por la propia CLI de Supabase (nunca
// copiadas/adivinadas, y nunca las de .env.local -- este script no lo
// abre ni lo lee en ningún momento). Pensado para una instalación nueva:
// after `npm install && npm run supabase:start`, corré
// `npm run test:env:generate` y ya queda listo para `npm run dev:test` /
// `npm run build:test` / `npm run start:test`.
//
// Reproducible: cada corrida pisa .env.test.local completo (nunca lo
// mezcla con lo que hubiera antes) y nunca llega a escribirse en git
// (.gitignore ya cubre ".env*.local" -- ver sección de más abajo).
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

function getSupabaseStatus() {
  let raw;
  try {
    // shell:true es necesario en Windows -- "npx" ahí es "npx.cmd", un
    // script de shell, no un ejecutable directo (EINVAL sin esto). Node
    // avisa que pasar args con shell:true es riesgoso en general (no se
    // escapan) -- acá no aplica: los args son literales fijos de este
    // archivo, nunca interpolación de ninguna entrada externa/del usuario.
    raw = execFileSync("npx", ["supabase", "status"], { encoding: "utf8", shell: true });
  } catch (err) {
    console.error(
      "[test:env:generate] No se pudo leer el estado de Supabase local -- " +
        '¿está corriendo? Probá "npm run supabase:start" primero.',
    );
    console.error(String(err.stderr ?? err.message ?? err));
    process.exit(1);
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.error("[test:env:generate] La salida de \"supabase status\" no se pudo interpretar como JSON:");
    console.error(raw);
    process.exit(1);
  }
}

const status = getSupabaseStatus();
if (!status.API_URL || !status.ANON_KEY || !status.SERVICE_ROLE_KEY) {
  console.error(
    '[test:env:generate] Faltan campos esperados (API_URL/ANON_KEY/SERVICE_ROLE_KEY) en la salida de "supabase status".',
  );
  process.exit(1);
}

const adminSessionSecret = randomBytes(32).toString("hex");
const port = process.env.TEST_SERVER_PORT ?? "3100";

const content = `# ============================================================================
# Generado automáticamente por scripts/generate-test-env.mjs (Fase 4B.2) --
# NO EDITAR A MANO, volver a correr "npm run test:env:generate" en vez de
# tocar este archivo. Nunca se leyó ni se copió .env.local para armarlo --
# todo lo de Supabase viene de "npx supabase status" (la instancia LOCAL
# ya corriendo), y el resto son valores vacíos/generados.
#
# Este archivo nunca se sube a git -- ver .gitignore (".env*.local").
# ============================================================================

NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}

# Sentinel obligatorio -- ver lib/test-env-loader.ts (requireTestMarkerInFile)
# y lib/test-env-guard.ts. Sin esto, scripts/test-env.mjs rechaza el archivo.
SUPABASE_TEST_ENV=local

# Exclusivo de este entorno -- generado ahora (crypto.randomBytes(32)),
# nunca es ni deriva del valor real de .env.local.
ADMIN_SESSION_SECRET=${adminSessionSecret}

NEXT_PUBLIC_SITE_URL=http://127.0.0.1:${port}

# ── Servicios externos deshabilitados a propósito (vacíos) ─────────────────
BLOB_READ_WRITE_TOKEN=
NEXT_PUBLIC_META_PIXEL_ID=
META_FEED_TOKEN=
META_FEED_CURRENCY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
`;

const outPath = path.resolve(process.cwd(), ".env.test.local");
writeFileSync(outPath, content, "utf8");
console.log(`[test:env:generate] Escrito ${outPath} usando la instancia local en ${status.API_URL}.`);
