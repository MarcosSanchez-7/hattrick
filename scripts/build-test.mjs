// Fase 4B.2 -- build de producción (`next build`) con el entorno de
// pruebas aislado, para poder validar Full Route Cache/ISR en
// condiciones equivalentes a producción real sin tocar Supabase Cloud.
// Sale a .next-test (ver next.config.ts), nunca a .next.
import { spawn } from "node:child_process";
import path from "node:path";
import { loadAndAssertTestEnv } from "./test-env.mjs";

const env = loadAndAssertTestEnv();
const nextBin = path.resolve(process.cwd(), "node_modules/next/dist/bin/next");

console.log(`[build:test] NEXT_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL} -- distDir=.next-test`);

const child = spawn(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
