// Fase 4B.2 -- sirve el build de .next-test (`next start`) con el entorno
// de pruebas aislado, puerto 3100. Requiere haber corrido antes
// "npm run build:test" -- next start no compila nada, solo sirve lo que
// ya esté en distDir.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadAndAssertTestEnv } from "./test-env.mjs";

const env = loadAndAssertTestEnv();

const distDir = path.resolve(process.cwd(), ".next-test");
if (!existsSync(distDir)) {
  console.error(
    `[start:test] Falta ${distDir} -- corré "npm run build:test" primero (next start no compila nada).`,
  );
  process.exit(1);
}

const port = process.env.TEST_SERVER_PORT ?? "3100";
const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");

console.log(`[start:test] NEXT_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL} -- puerto ${port}`);

const child = spawn(process.execPath, [nextBin, "start", "--port", port], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
