# Pruebas locales

Verificar siempre los scripts reales en `package.json` antes de ejecutar nada — no asumir nombres de comandos. Entorno confirmado: Docker + Supabase CLI fijada a una versión, API en `127.0.0.1:54321`, DB en `54322`, Studio en `54323`, app de prueba en el puerto `3100` (`npm run start:test`, configurable con `TEST_SERVER_PORT`). El guard (`scripts/test-env.mjs`) y el loader de entorno aislado son obligatorios antes de cualquier escritura de prueba; `.env.test.local` se genera localmente (`npm run test:env:generate`) y nunca se copia desde `.env.local`. Si no se puede demostrar que el entorno está aislado de producción, detenerse.

Scripts confirmados en `package.json`:

```
npm run supabase:start     # levanta el stack local (Docker)
npm run supabase:stop
npm run supabase:reset     # reset DESTRUCTIVO del contenido — solo con turno exclusivo
npm run test:env:generate  # genera .env.test.local desde "supabase status", nunca desde .env.local
npx tsc --noEmit
npm test                   # 149 pruebas unitarias, node --test lib/*.test.ts
npm run build:test         # build contra .next-test, distDir separado del build normal
npm run start:test         # sirve ese build en el puerto 3100
npm run dev:test           # equivalente de next dev, mismo entorno aislado
```

Suites de integración reales en `tests/integration/` (requieren `build:test` + `start:test` corriendo):

| Archivo | Escenarios |
|---|---|
| `run-scenarios.mjs` | 23 |
| `run-cart-search-cache.mjs` | 6 |
| `run-ttl-verification.mjs` | 5 |
| `run-sitemap.mjs` | 7 |
| `run-prefetch-policy.mjs` | 18 (navegador real, Playwright) |

Total confirmado en el checkpoint 13: **149 unitarias + 41 de integración (23+6+5+7) + 18 de navegador = 208**. El escenario de importación CSV de ventas dentro de `run-scenarios.mjs` es conocido por fallar si se corre dos veces sin resetear la base entre medio (deja una fila que colisiona con la siguiente corrida) — no es una regresión de código, es contaminación de estado entre corridas repetidas en la misma sesión; resetear con `supabase db reset` antes de una corrida que necesite ser limpia.

Limitación de cobertura de 7B.1: las siete pruebas unitarias de `lib/settings-merge.test.ts` verifican la fusión pura de valores y fallbacks, pero no reproducen por sí solas la deduplicación real de `React.cache()` dentro de un render de Next/React. Esa propiedad se valida por la implementación y las mediciones/integraciones registradas de la fase; no se debe presentar la suite unitaria pura como prueba aislada de la caché de render.

Deuda de testing 7B.1-R: los probes manuales de restauración wholesale para fila completa, parcial, ausente y JSON `null` se ejecutaron de forma temporal y no son una suite permanente. Cuando se autorice ampliar la cobertura, evaluar una suite aislada dedicada que prepare y restaure esos estados sin mezclarla con los 23 escenarios generales.

Nunca usar `next dev` para validar comportamiento de ISR, prefetch o caché — usar siempre `build:test`/`start:test`. Bloquear integraciones externas (WhatsApp, Meta Pixel) durante cualquier prueba automatizada. No ocultar fallos intermitentes ni reportar un reintento como si fuera éxito en el primer intento — documentar la causa real cuando se identifique.
