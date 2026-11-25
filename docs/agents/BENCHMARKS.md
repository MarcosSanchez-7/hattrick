# Mediciones históricas reportadas

No verificadas independientemente en esta integración documental (son resultados de fases anteriores, citados tal cual se reportaron entonces). No sumar porcentajes entre fases ni extrapolar a factura de hosting.

- **RSC (fases tempranas):** hasta ~85% menos en determinadas rutas; el layout eliminó 26 llamadas `.from` repartidas en páginas que antes las pedían por separado.
- **ISR:** TTL anterior 60s; reducción teórica de regeneraciones 80–99.93% con los TTL nuevos (900/300/3600/86400s según ruta) — no es un ahorro facturable medido, es la reducción de la *frecuencia máxima* de regeneración.
- **Sitemap:** 8→4 consultas HTTP reales por regeneración; 0 en HIT. 34–83ms→5–11ms de latencia local en HIT. Categorías se seguían pidiendo duplicadas en la versión anterior; `lastModified` real solo en productos (vía `updated_at`).
- **Prefetch — tres métricas DISTINTAS, no intercambiables (Fase 6B, escenario de categoría):**
  - *Solicitudes de prefetch específicamente* (`rsc=1` + `next-router-prefetch=1`): desktop −87%, móvil −93%.
  - *Solicitudes HTTP totales* de la misma carga de página (prefetch + todo lo demás): desktop 142.8→34.5 promedio (−76%), móvil 122.5→25 (−80%).
  - *Bytes de prefetch transferidos*: −91% desktop, −95% móvil.
  Las tres cifras son reales (verificadas contra los datos crudos de esa fase durante esta auditoría), pero responden preguntas distintas — no deben combinarse como si fueran una sola reducción. Latencia de navegación: no concluyente en esa fase (muestra chica, variables de entorno no controladas).
- **7A — consultas HTTP reales a PostgREST durante `build:test`:** N=7: 286; N=50: 1422; N=147: 6810; N=300: 22110. De esas, las relaciones por lotes de 20 (variantes/parches/proveedores/stock por proveedor) representan 18360 de las 22110 a N=300. Patrón de crecimiento compatible con cuadrático (número de páginas × número de lotes, ambos crecen con N); no se confirmó un N+1 clásico por producto individual.
- **7A — prueba experimental de ISR:** prefetch sobre entrada vigente y sobre entrada realmente vencida: 0 consultas observadas en ambos casos (el prefetch no disparó regeneración en segundo plano en esa corrida). Navegación efectiva sobre entrada vencida: 41 consultas (regeneración real). Resultado de una corrida acotada — no generalizar sin repetir el experimento.
- **7B.1 — antes/después de memoizar `getSetting()` por clave:** consultas totales de build 286→283, 6810→6807, 22110→22107 (constante −3, no escala con N). Consultas a `site_settings`: 136→133, 1116→1113, 2187→2184. Ruta `/mayorista`: 6→4 consultas de settings por regeneración; `/` (inicio): 11→10. A N=7: bytes de consulta 394919→394602, filas 856→853. Sin mejora de tiempo de build estadísticamente significativa medida. La memoización lee la fila cruda por clave y aplica el fallback fuera del caché; un error transitorio de Supabase queda "fijado" (se reutiliza el resultado de fallback) para el resto de ese mismo render. No se implementó agrupación (`.in("key", keys)`) — se evaluó y se descartó por conflicto con la deduplicación cruzada ya lograda (ver `docs/agents/REPORT-7B1.md`).

## Protocolo para futuras mediciones

Registrar siempre: commit/checkpoint, dataset sintético usado y filas por tabla, entorno (local/worktree), estado de caché, número de repeticiones, si la medición es de build o de runtime, HTTP efectivamente ejecutado (no construcción de query builder), filas, bytes, tiempos, errores encontrados y limitaciones del experimento — sin incluir secretos. Separar siempre estimación de medición real, y nunca mezclar métricas distintas (solicitudes vs. bytes vs. filas vs. latencia) bajo un solo porcentaje sin aclarar cuál es cuál.
