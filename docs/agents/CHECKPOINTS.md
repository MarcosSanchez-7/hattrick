# Historial de checkpoints (verificado con `git log`)

| Nº | Hash | Mensaje |
|---|---|---|
| 1 | `bd5652f` | refactor(cache): deduplicate queries and centralize product invalidation |
| 2 | `af50853` | refactor(cache): scope admin cache invalidations to affected routes |
| 3 | `f15dc1f` | perf(catalog): minimize shared catalog payload |
| 4 | `a1c7943` | refactor(cart): decouple cart resolution from shared catalog |
| 5 | `e1d9b61` | perf(search): decouple search and wishlist from shared catalog |
| 6 | `60a0440` | perf(layout): remove unused shared catalog query |
| 7 | `bf1a56b` | fix(cache): isolate revalidation failures after CSV sales import |
| 8 | `e6c75e2` | test(infra): establish isolated Supabase integration environment |
| 9 | `be0adc5` | test(cache): verify ISR invalidation with isolated integration scenarios |
| 10 | `014608d` | perf(cache): extend ISR intervals with verified on-demand revalidation |
| 11 | `c80300e` | perf(seo): cache sitemap and minimize catalog queries |
| 12 | `3c7db70` | perf(navigation): reduce automatic prefetch in product cards and footer |
| 13 | `21b0efb` | perf(data): memoize site settings by key per render |

Hash completo del checkpoint 13 (el más reciente, confirmado con `git log -1`): `21b0efb25a587ecbb530aecfb850f14c2b8d2872`.

Todos los hashes de esta tabla fueron verificados contra `git log --oneline` durante la integración documental multiagente (checkpoint base `21b0efb25a587ecbb530aecfb850f14c2b8d2872`, rama `main`). Ninguno fue inventado ni asumido.

Al cerrar un commit nuevo autorizado, el escritor del turno agrega su fila aquí con hash real (nunca inventado), mensaje exacto, alcance, pruebas ejecutadas y limitaciones — antes de ceder el turno en `HANDOFF.md`.
