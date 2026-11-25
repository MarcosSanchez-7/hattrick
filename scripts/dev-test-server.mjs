// Fase 4B.2 -- arranca `next dev` con el entorno de pruebas aislado
// (ver scripts/test-env.mjs, punto de entrada obligatorio: si
// .env.test.local falta o es inconsistente, el proceso termina ACÁ,
// nunca llega a invocar a Next).
import { spawn } from "node:child_process";
import path from "node:path";
import { loadAndAssertTestEnv } from "./test-env.mjs";

const env = loadAndAssertTestEnv();

const port = process.env.TEST_SERVER_PORT ?? "3100";
const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");

console.log(
  `[dev:test] NEXT_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL} -- NODE_ENV=${env.NODE_ENV} -- puerto ${port}`,
);

const child = spawn(process.execPath, [nextBin, "dev", "--port", port], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
