# Plan vigente (provisional)

Completado y confirmado contra Git: fases 1–6, 7A, 7B.1 (checkpoint 13, `21b0efb25a587ecbb530aecfb850f14c2b8d2872`), 7B.2, 7B.3 (cierre en checkpoint 17, `2665f41eddf4dc2b210eabcccc8a2c626717e221`), 7B.4 (checkpoint 18, `10fd04c2c259e6ae35b3b366a223857b53e7794a`) y 7B.5 (checkpoint 19, `5a5b346b52a8c900581a6c76949573be9628f295`).

7C (comparación acumulada CP12↔CP19) queda cerrada tras auditoría independiente 7C-C y correcciones documentales: sus conteos de wrapper son intentos de `fetch`, no tráfico de red efectivo; la explicación HTTP/SQL es hipótesis plausible, no causalidad confirmada. 7B.6 queda diferida y no constituye requisito para producción. La Fase 8 permanece pendiente de autorización explícita.

Pendiente de autorización (no iniciar sin ella):

1. **7B.6**: diferida; evaluar relaciones anidadas de PostgREST, tamaño de lotes e índices solo si un experimento futuro mide red efectiva, tiempo SQL, filas/planes/I/O y justifica el cambio. No es requisito para producción; no migraciones por defecto.
2. **Fase 8**: auditoría final de rendimiento, seguridad y regresiones; pendiente de autorización explícita.
3. **Fase 9**: comparar hosting y costos vigentes, compatibilidad con ISR y Blob, restricciones comerciales.
4. **Fase 10**: preproducción aislada, plan de rollback, autorización de publicación, observación de métricas reales.
5. **HATTRICK LAB**: estudio educativo posterior con los checkpoints y ejercicios de este proyecto.

No ejecutar esta lista automáticamente. Si una fase futura resuelve parte de otra, proponerlo antes de implementar. Cada fase requiere alcance, pruebas y aprobación independiente del commit — ninguna autorización es transitiva entre fases ni entre agentes.
