# Fase 7B.1 — Optimización de `site_settings`

**Checkpoint base:** `3c7db7030d0ca53805b241d29c153944ce174f6e`. **Checkpoint resultante, confirmado:** `21b0efb25a587ecbb530aecfb850f14c2b8d2872` (commit `perf(data): memoize site settings by key per render`, verificado con `git log -1` — ya no está pendiente).

## 1. Arquitectura anterior de `site_settings`

`getSetting<T>(key, fallback)` (en `lib/data.ts`) hacía una consulta directa a `site_settings` **sin ningún tipo de memoización**, a diferencia de `getAllProducts`/`getAllCategories`/`getAllTags`/`getAllPages` (todas envueltas en `React.cache()`). Cada llamada, sin importar cuántas veces se repitiera la misma `key` dentro del mismo render, era un round-trip real a Supabase.

Consumidores confirmados por grep (14 claves en `SiteSettingsKey`):

- **layout.tsx** (toda página pública): `navbar`, `footer`, `branding`, `wholesale` — 4 llamadas en cada render.
- **page.tsx** (home): `hero`, `customBanner`, `home`, `valueProps`, `reviews`, `dtf`, **`wholesale`** (duplica layout).
- **mayorista/page.tsx**: **`wholesale`** y **`footer`** (ambas duplican layout).
- **carrito/page.tsx**: **`footer`** (duplica layout).
- **personalizacion/page.tsx**: `customBanner`, `personalizationGallery`.
- **producto/[slug]/page.tsx**: `productNotices`, `productInfo`, `customBanner`.
- Panel admin: cada página de `/gestion-ssjblue/generales/*` pide su propia clave — **sin cambios en esta fase**.

## 2. Consultas duplicadas confirmadas

Confirmadas leyendo el código (no hipótesis) y luego medidas:

- **`wholesale`**: layout + home, layout + mayorista → hasta 2 consultas extra por render donde ambas coinciden.
- **`footer`**: layout + mayorista, layout + carrito → 1 consulta extra por render donde coinciden.
- `branding` también se vuelve a pedir desde `app/icon.tsx`/`app/apple-icon.tsx`, pero esos son archivos especiales que generan su propia respuesta de forma aislada (mismo tipo de límite de `React.cache()` ya documentado para `sitemap.ts`) — **no se puede resolver con memoización por request**, y se documenta como limitación, no como bug de este cambio.

## 3 y 4. Alternativas evaluadas y solución seleccionada

- **A. Memoización por clave vía `React.cache()`**: elegida.
- **B. Recuperación agrupada `.in("key", keys)`**: evaluada y **descartada** por una razón técnica concreta, no por preferencia: `cache()` solo deduplica llamadas con los MISMOS argumentos. Un fetch agrupado por un array de keys usaría ese array (o su contenido serializado) como clave de caché — dos llamadas agrupadas con conjuntos de claves distintos (el de `layout.tsx`: 4 claves; el de `page.tsx`: 7 claves) nunca deduplicarían entre sí aunque compartan `wholesale`, porque sus argumentos de `cache()` serían diferentes. Implementar B habría exigido elegir entre perder la deduplicación cruzada que A ya logra, o introducir una capa de caché persistente a nivel de módulo — explícitamente prohibida en esta fase.
- **C. Reutilización explícita**: lograda como efecto directo de A.
- **D (elegida)**: A sola, sin B. Es la alternativa más simple que produce un ahorro medible y no entra en conflicto con ninguna restricción.

**Identidad de argumentos de `React.cache()`:** `fetchSettingRaw(key)` memoiza **solo sobre `key`** (string primitivo) — nunca sobre `fallback`. Envolver la función completa habría hecho que dos llamadas a la misma `key` con fallbacks que no sean la misma referencia de objeto jamás deduplicaran entre sí (comparación `SameValueZero`). Hoy no muerde porque todos los llamadores reusan las mismas constantes `DEFAULT_*`, pero el diseño no depende de esa suposición.

## 5. Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/data.ts` | `getSetting()` ahora usa `fetchSettingRaw` (memoizado por `key`) + `mergeSettingValue` (importada de `lib/settings-merge.ts`) |
| `lib/settings-merge.ts` | nuevo — fusión pura, sin Supabase, testeable con Node nativo |
| `lib/settings-merge.test.ts` | nuevo — 7 pruebas unitarias |
| `tests/integration/run-scenarios.mjs` | +1 escenario: `wholesale` reflejado correctamente en `/` y `/mayorista` a la vez |

Ningún llamador (`layout.tsx`, `page.tsx`, `mayorista`, `personalizacion`, `producto`, `carrito`) necesitó cambios — la firma pública de `getSetting()` es idéntica.

## 6. Comparación A/B por dataset

**Consultas totales durante `build:test`:**

| Dataset | Baseline | Variante | Δ |
|---|---|---|---|
| N=7 | 286 | 283 | −3 |
| N=147 | 6810 | 6807 | −3 |
| N=300 | 22110 | 22107 | −3 |

**Consultas a `site_settings` específicamente:**

| Dataset | Baseline | Variante | Δ |
|---|---|---|---|
| N=7 | 136 | 133 | −3 |
| N=147 | 1116 | 1113 | −3 |
| N=300 | 2187 | 2184 | −3 |

El ahorro es una constante de −3, no escala con N: la duplicación ocurre entre `layout.tsx` y 3 páginas puntuales (home, mayorista, carrito), cada una renderizada una sola vez sin importar el tamaño del catálogo. El costo dominante (las páginas de producto/categoría re-pidiendo el catálogo completo) no se toca en esta subfase.

## 7. Consultas por ruta (N=300, tras invalidación global real de "wholesale")

| Ruta | Baseline | Variante | Δ |
|---|---|---|---|
| `/` | 11 | 10 | −1 |
| `/producto/[slug]` | 7 | 7 | 0 |
| `/categoria/[...slug]` | 4 | 4 | 0 |
| `/mayorista` | 6 | 4 | −2 (−33%) |
| `/personalizacion` | 6 | 6 | 0 |
| `/pagina/[slug]` | 4 | 4 | 0 |

## 8. Bytes, filas y tiempos

Bytes de consulta: 394919→394602 (N=7). Filas: 856→853. Sin diferencia de tiempo de build estadísticamente significativa medida — no se afirma una mejora de tiempo, solo de cantidad de consultas.

## 9. Validación de equivalencia funcional

7 pruebas unitarias puras (`lib/settings-merge.test.ts`): configuración existente, inexistente, error de consulta, valor JSON `null`, JSON complejo (fusión superficial preservada), dos fallbacks distintos para la misma lectura cruda (no se pisan), claves repetidas (mismo resultado, sin estado compartido).

## 10. Validación de invalidaciones administrativas

Branding, footer, home (banners), galería de personalización, saleStatusColors (admin-only) — los 5 escenarios preexistentes siguen pasando sin cambios. Escenario nuevo: actualizar wholesale una sola vez y confirmar que `/` y `/mayorista` reflejan el cambio de inmediato y de forma consistente entre sí. Ninguna invalidación existente (`revalidatePath` vía `lib/revalidate.ts`) fue modificada.

## 11. Resultados de pruebas (checkpoint 13)

`npx tsc --noEmit` sin errores. 149/149 unitarias (142 + 7 nuevas). 41/41 escenarios de integración (23+6+7+5). 18/18 de prefetch. `build:test`/`start:test` sin errores sobre el dataset de 7 productos restaurado.

## 12. Riesgos y limitaciones

Ahorro modesto y constante, no escala con el catálogo. Cambio de semántica ante errores transitorios: la decisión de la primera llamada a una clave dentro de un render queda fija para el resto de ese mismo render (más consistente, no menos correcto, pero es un cambio real). `branding` en `app/icon.tsx`/`app/apple-icon.tsx` sigue duplicado, sin solución posible con esta técnica. Los datasets sintéticos no reproducen la distribución real de configuraciones de HATTRICK.

## 13. Confirmación de limpieza (checkpoint 13)

Worktree `wt-7b1` eliminado. Instrumentación temporal existió únicamente en ese worktree. Dataset restaurado a 7 productos. `.next-test` reconstruido limpio. El commit `21b0efb25a587ecbb530aecfb850f14c2b8d2872` incluyó exactamente `lib/data.ts`, `lib/settings-merge.ts`, `lib/settings-merge.test.ts` y `tests/integration/run-scenarios.mjs` — confirmado con `git show --stat`.
