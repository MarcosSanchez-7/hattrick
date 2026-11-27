# Pruebas locales

Verificar siempre los scripts reales en `package.json` antes de ejecutar nada — no asumir nombres de comandos. Entorno confirmado: Docker + Supabase CLI fijada a una versión, API en `127.0.0.1:54321`, DB en `54322`, Studio en `54323`, app de prueba en el puerto `3100` (`npm run start:test`, configurable con `TEST_SERVER_PORT`). El guard (`scripts/test-env.mjs`) y el loader de entorno aislado son obligatorios antes de cualquier escritura de prueba; `.env.test.local` se genera localmente (`npm run test:env:generate`) y nunca se copia desde `.env.local`. Si no se puede demostrar que el entorno está aislado de producción, detenerse.

Scripts confirmados en `package.json`:

```
npm run supabase:start     # levanta el stack local (Docker)
npm run supabase:stop
npm run supabase:reset     # reset DESTRUCTIVO del contenido — solo con turno exclusivo
npm run test:env:generate  # genera .env.test.local desde "supabase status", nunca desde .env.local
npx tsc --noEmit
npm test                   # 176 pruebas unitarias, node --test lib/*.test.ts
npm run build:test         # build contra .next-test, distDir separado del build normal
npm run start:test         # sirve ese build en el puerto 3100
npm run dev:test           # equivalente de next dev, mismo entorno aislado
```

Suites de integración reales en `tests/integration/` (requieren `build:test` + `start:test` corriendo):

| Archivo | Escenarios |
|---|---|
| `run-scenarios.mjs` | 32 |
| `run-cart-search-cache.mjs` | 6 |
| `run-ttl-verification.mjs` | 5 |
| `run-sitemap.mjs` | 7 |
| `run-prefetch-policy.mjs` | 18 (navegador real, Playwright) |
| `run-admin-authorization.mjs` (Fase 8C-R) | 183 — matriz de roles, 401 sin sesión y no-mutación con contenido de filas |
| `run-admin-session-staleness.mjs` (Fase 8C-R) | 12 — cambios de rol/eliminación con identidad JWT del fixture, misma cookie y 401 directo |
| `run-admin-sensitive-data.mjs` (Fase 8C-R3) | 30 — datos sensibles de productos y movimientos: fixtures reales, JSON, HTML/RSC, 401/403 y contenido autorizado por rol |
| `run-admin-role-ui.mjs` (Fase 8C-R3) | 14 (navegador real, Playwright) — navegación, solo lectura y acceso directo por rol, incluido historial de movimientos |

**Fase 8C-R — autorización administrativa (editor/viewer/vendedor/superadmin):** `lib/admin-auth.test.ts` y `lib/admin-route-coverage.test.ts` cubren matriz, deny-by-default y un inventario AST cerrado de 40 rutas/76 métodos (73 protegidos, tres excepciones públicas explícitas). El AST exige un guard nombrado, permiso esperado y consumo de resultado antes del handler; no sustituye integración ni revisión humana para orden semántico, efectos secundarios o páginas Server Component. Las cuatro suites administrativas usan Supabase local real y fixtures sintéticas que eliminan en `finally`. La prueba de sesión asocia internamente el `adminId` del JWT con el fixture, usa `redirect: "manual"` y exige 401/ruta/JSON de autorización tras borrarlo, sin imprimir secretos.

Resultados históricos reportados por Claude Code para 8B.2: **461** pruebas y escenarios. Se conservan como histórico; no hay evidencia versionada suficiente para afirmar que el 8/8 de sesiones verificara correctamente el caso de usuario eliminado.

Resultados históricos ejecutados por Codex en 8C-R: TypeScript correcto; **176/176** unitarias; build aislado correcto (Turbopack); **32/32** `run-scenarios.mjs`; **6/6** carrito/búsqueda; **7/7** sitemap; **18/18** prefetch; **5/5** TTL; **183/183** autorización administrativa; **12/12** sesiones; **20/20** datos sensibles; **13/13** interfaz por rol. Total histórico: **472** pruebas y escenarios.

Resultados nuevos de 8C-R3: TypeScript correcto, **176/176** unitarias, sintaxis de los scripts de integración y `git diff --check` correctos; build aislado Turbopack correcto; **183/183** autorización administrativa; **30/30** datos sensibles; **14/14** interfaz por rol; **32/32** escenarios administrativos/storefront; y **12/12** sesiones obsoletas. Total nuevo: **447** pruebas y escenarios, además de TypeScript y build. El fixture de movimiento usa una salida `psql` controlada con `ON_ERROR_STOP` y parser estricto de un único `bigint`; valida que la fila corresponde al tipo/nota/responsable esperados y conserva el error de prueba original si también falla la limpieza. Carrito/búsqueda, sitemap, prefetch y TTL no se repitieron: conservan evidencia histórica porque esta corrección no modifica sus dependencias relevantes.

**8C-R4 (revisión final independiente de solo lectura, previa a CP21):** auditoría favorable, sin hallazgos nuevos ni reapertura de hallazgos previos. Confirmó por lectura directa de código (no por ejecución) que el permiso `inventory.movements.read` está correctamente cerrado en la matriz, aplicado antes de cualquier lectura sensible en API y página, sin ruta alternativa de acceso, y que las cuatro suites administrativas cumplen los requisitos técnicos de la Fase 8C-R3 (fixture con `ON_ERROR_STOP`/parser estricto/verificación de identidad/limpieza en `finally`; pruebas positivas con presencia real de datos sensibles; pruebas negativas que distinguen 403/401/redirección manual de una respuesta vacía o un error). Total acumulado de pruebas y escenarios documentados a través de las fases 8B.2–8C-R3: **447** nuevos (8C-R3) + **36** históricos no repetidos (6 carrito/búsqueda + 7 sitemap + 18 prefetch + 5 TTL) = **483** evidencias acumuladas. Esta cifra es una reconciliación documental contra el código y las corridas ya reportadas por cada fase — no afirma que las 483 se ejecutaran en una misma ronda ni que 8C-R4 haya ejecutado ninguna prueba (fue estrictamente de solo lectura). Riesgo residual aceptado: el warning histórico de `node:crypto` en Edge Instrumentation sigue apareciendo en `build:test`; queda diferido para evaluación en Fase 9, sin corregir en este alcance.

Total histórico confirmado en el checkpoint 13: **149 unitarias + 41 de integración (23+6+5+7) + 18 de navegador = 208**. El escenario de importación CSV de ventas dentro de `run-scenarios.mjs` es conocido por fallar si se corre dos veces sin resetear la base entre medio (deja una fila que colisiona con la siguiente corrida) — no es una regresión de código, es contaminación de estado entre corridas repetidas en la misma sesión; resetear con `supabase db reset` antes de una corrida que necesite ser limpia.

Limitación de cobertura de 7B.1: las siete pruebas unitarias de `lib/settings-merge.test.ts` verifican la fusión pura de valores y fallbacks, pero no reproducen por sí solas la deduplicación real de `React.cache()` dentro de un render de Next/React. Esa propiedad se valida por la implementación y las mediciones/integraciones registradas de la fase; no se debe presentar la suite unitaria pura como prueba aislada de la caché de render.

Deuda de testing 7B.1-R: los probes manuales de restauración wholesale para fila completa, parcial, ausente y JSON `null` se ejecutaron de forma temporal y no son una suite permanente. Cuando se autorice ampliar la cobertura, evaluar una suite aislada dedicada que prepare y restaure esos estados sin mezclarla con los 23 escenarios generales.

Nunca usar `next dev` para validar comportamiento de ISR, prefetch o caché — usar siempre `build:test`/`start:test`. Bloquear integraciones externas (WhatsApp, Meta Pixel) durante cualquier prueba automatizada. No ocultar fallos intermitentes ni reportar un reintento como si fuera éxito en el primer intento — documentar la causa real cuando se identifique.
