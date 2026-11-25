# Plan vigente (provisional)

Completado y confirmado contra Git: fases 1–6, 7A, 7B.1 (checkpoint 13, `21b0efb25a587ecbb530aecfb850f14c2b8d2872`).

En curso: integración documental multiagente (Claude Code + Codex dentro de Antigravity) — fusión de `hattrick-agentes/` hacia `AGENTS.md`/`CLAUDE.md`/`docs/agents/`/`README.md`/skill, exclusivamente documental, sin tocar código.

Pendiente de autorización (no iniciar sin ella):

1. **7B.2**: reutilización de categorías entre funciones. Medir duplicados por contexto, evaluar paso explícito de resultados; conservar ocultos y descendientes. Alcance exacto requiere autorización separada.
2. **7B.3**: ficha de producto especializada por slug, metadata y relacionados; evitar traer el catálogo completo, preservar stock/precio/visibilidad/orden.
3. **7B.4**: proyecciones públicas y administrativas según contratos de datos por consumidor.
4. **7B.5**: listados y `/buscar`, filtros y orden equivalentes a los actuales.
5. **7B.6**: evaluar relaciones anidadas de PostgREST, tamaño de lotes e índices — solo si hay evidencia medida que lo justifique; no migraciones por defecto.
6. **7C**: comparación A/B acumulada con datasets sintéticos de 7/50/147/300 productos y sus relaciones.
7. **Fase 8**: auditoría final de rendimiento, seguridad y regresiones.
8. **Fase 9**: comparar hosting y costos vigentes, compatibilidad con ISR y Blob, restricciones comerciales.
9. **Fase 10**: preproducción aislada, plan de rollback, autorización de publicación, observación de métricas reales.
10. **HATTRICK LAB**: estudio educativo posterior con los checkpoints y ejercicios de este proyecto.

No ejecutar esta lista automáticamente. Si una fase futura resuelve parte de otra, proponerlo antes de implementar. Cada fase requiere alcance, pruebas y aprobación independiente del commit — ninguna autorización es transitiva entre fases ni entre agentes.
