# Plan vigente (provisional)

Completado y confirmado contra Git: fases 1–6, 7A, 7B.1 (checkpoint 13, `21b0efb25a587ecbb530aecfb850f14c2b8d2872`), 7B.2, 7B.3 (cierre en checkpoint 17, `2665f41eddf4dc2b210eabcccc8a2c626717e221`) y 7B.4 (hidratación pública diferenciada de ficha/relacionados, cierre en checkpoint 18, `10fd04c2c259e6ae35b3b366a223857b53e7794a`).

7B.5-B (lector público de listados `getPublicCatalogProducts()`, contrato `SharedCatalogProduct`) y su auditoría 7B.5-C están cerradas por autorización del propietario; el checkpoint 19 se crea en este cierre con hash real posterior. 7B.6 queda diferida hasta disponer de resultados de 7C; 7C permanece pendiente de autorización explícita.

Pendiente de autorización (no iniciar sin ella):

1. **7B.6**: diferida hasta conocer resultados de 7C; evaluar relaciones anidadas de PostgREST, tamaño de lotes e índices solo si hay evidencia medida que lo justifique; no migraciones por defecto.
2. **7C**: comparación A/B acumulada con datasets sintéticos de 7/50/147/300 productos y sus relaciones; pendiente de autorización explícita.
4. **Fase 8**: auditoría final de rendimiento, seguridad y regresiones.
5. **Fase 9**: comparar hosting y costos vigentes, compatibilidad con ISR y Blob, restricciones comerciales.
6. **Fase 10**: preproducción aislada, plan de rollback, autorización de publicación, observación de métricas reales.
7. **HATTRICK LAB**: estudio educativo posterior con los checkpoints y ejercicios de este proyecto.

No ejecutar esta lista automáticamente. Si una fase futura resuelve parte de otra, proponerlo antes de implementar. Cada fase requiere alcance, pruebas y aprobación independiente del commit — ninguna autorización es transitiva entre fases ni entre agentes.
