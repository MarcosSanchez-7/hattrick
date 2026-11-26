# Plan vigente (provisional)

Completado y confirmado contra Git: fases 1–6, 7A, 7B.1 (checkpoint 13, `21b0efb25a587ecbb530aecfb850f14c2b8d2872`), 7B.2, 7B.3 y su cierre en checkpoint 17 (`2665f41eddf4dc2b210eabcccc8a2c626717e221`).

En curso, sin commit: 7B.4-B, hidratación pública diferenciada de ficha y relacionados. Queda pendiente exclusivamente la auditoría independiente y la decisión del propietario; no autoriza 7B.5.

Pendiente de autorización (no iniciar sin ella):

1. **7B.5**: listados y `/buscar`, filtros y orden equivalentes a los actuales.
2. **7B.6**: evaluar relaciones anidadas de PostgREST, tamaño de lotes e índices — solo si hay evidencia medida que lo justifique; no migraciones por defecto.
3. **7C**: comparación A/B acumulada con datasets sintéticos de 7/50/147/300 productos y sus relaciones.
4. **Fase 8**: auditoría final de rendimiento, seguridad y regresiones.
5. **Fase 9**: comparar hosting y costos vigentes, compatibilidad con ISR y Blob, restricciones comerciales.
6. **Fase 10**: preproducción aislada, plan de rollback, autorización de publicación, observación de métricas reales.
7. **HATTRICK LAB**: estudio educativo posterior con los checkpoints y ejercicios de este proyecto.

No ejecutar esta lista automáticamente. Si una fase futura resuelve parte de otra, proponerlo antes de implementar. Cada fase requiere alcance, pruebas y aprobación independiente del commit — ninguna autorización es transitiva entre fases ni entre agentes.
