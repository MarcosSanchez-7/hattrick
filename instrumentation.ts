// Hook de arranque de Next (corre una sola vez, antes de que el servidor
// empiece a atender requests -- por lo tanto antes de que cualquier ruta
// pueda llegar a crear un cliente de Supabase). Fase 4B.2: en el camino
// normal (dev o producción contra Supabase Cloud, sin SUPABASE_TEST_ENV
// definida) assertLocalSupabaseTestEnv() no hace nada -- esto no le agrega
// ninguna fricción a `npm run dev`/`npm start` tal como ya funcionaban.
// Solo cuando el servidor se arranca explícitamente con el entorno de
// pruebas (ver npm run dev:test, que carga .env.test.local con
// SUPABASE_TEST_ENV=local) se vuelve estricto: si la URL/clave no se
// pueden confirmar como la instancia local, el arranque mismo falla en
// vez de dejar que el servidor quede escuchando contra algo sin verificar.
export async function register() {
  const { assertLocalSupabaseTestEnv } = await import("@/lib/test-env-guard");
  assertLocalSupabaseTestEnv();
}
