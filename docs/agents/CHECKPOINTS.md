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
| 14 | `b889146` | docs(agents): establish shared Claude and Codex workflow |
| 15 | `a1f919a` | test(integration): harden wholesale restoration and cache assertions |
| 16 | `426f5f9` | perf(data): deduplicate category queries per render |
| 17 | `2665f41` | perf(data): scope product detail queries and related hydration |
| 18 | `10fd04c` | perf(data): separate public product hydration from admin data |
| 19 | `5a5b346` | perf(data): optimize public catalog listings and hydration |
| 20 | `804a11c` | docs(perf): consolidate cumulative benchmark findings |

Hash completo del checkpoint 19 (base real de 7C): `5a5b346b52a8c900581a6c76949573be9628f295`. Hash completo del checkpoint 20: `804a11c018ed57dfca806afade75bd29aaf29fc9`.

Todos los hashes de esta tabla fueron verificados contra `git log --oneline`. Ninguno fue inventado ni asumido. El checkpoint 19 es la base real de 7C; el checkpoint 20 cerró sus correcciones documentales. 7B.6 sigue diferida. La Fase 8C-R4 (revisión final de solo lectura) resultó favorable y el propietario autorizó la consolidación del checkpoint 21 sobre esta base; su fila con hash real se agrega a esta tabla en la actualización posterior al commit, conforme a la convención de abajo — no se inventa aquí.

Al cerrar un commit nuevo autorizado, el escritor del turno agrega su fila aquí con hash real (nunca inventado), mensaje exacto, alcance, pruebas ejecutadas y limitaciones — antes de ceder el turno en `HANDOFF.md`.
