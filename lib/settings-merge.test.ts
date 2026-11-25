// Pruebas automatizadas de lib/settings-merge.ts usando el test runner
// nativo de Node (node:test / node:assert) -- cero dependencias nuevas,
// mismo patrón que lib/shared-catalog-product.test.ts.
// Corre con: node --test lib/settings-merge.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSettingValue, type SettingFetchResult } from "./settings-merge.ts";

test("mergeSettingValue: configuración existente -- el valor leído pisa el fallback", () => {
  const fallback = { title: "Por defecto", lead: "Lead por defecto" };
  const result: SettingFetchResult = { found: true, value: { title: "Guardado" } };
  assert.deepEqual(mergeSettingValue(fallback, result), {
    title: "Guardado",
    lead: "Lead por defecto",
  });
});

test("mergeSettingValue: configuración inexistente -- devuelve el fallback sin tocarlo", () => {
  const fallback = { title: "Por defecto" };
  const result: SettingFetchResult = { found: false };
  const merged = mergeSettingValue(fallback, result);
  assert.deepEqual(merged, fallback);
});

test("mergeSettingValue: error de consulta -- fetchSettingRaw lo traduce a found:false, mismo resultado que una clave inexistente", () => {
  // fetchSettingRaw (lib/data.ts) atrapa cualquier error de Supabase y
  // devuelve { found: false } -- desde el punto de vista de esta fusión,
  // un error de consulta es indistinguible de una clave inexistente (en
  // ambos casos se usa el fallback), que es exactamente el comportamiento
  // que esta prueba fija.
  const fallback = { enabled: true, label: "Original" };
  const result: SettingFetchResult = { found: false };
  assert.deepEqual(mergeSettingValue(fallback, result), fallback);
});

test("mergeSettingValue: valor JSON null almacenado -- equivale a no tener datos propios, no rompe ni pisa el fallback", () => {
  const fallback = { title: "Por defecto", count: 3 };
  // Una fila puede existir con value = null (JSON null explícito) --
  // found es true (la fila SÍ existe), pero el contenido no aporta nada.
  const result: SettingFetchResult = { found: true, value: null };
  assert.deepEqual(mergeSettingValue(fallback, result), fallback);
});

test("mergeSettingValue: JSON complejo (arrays y objetos anidados) se fusiona superficialmente, no profundo", () => {
  const fallback = {
    points: ["a", "b"],
    image: { url: "default.png", alt: "default" },
    extra: "se conserva",
  };
  const result: SettingFetchResult = {
    found: true,
    value: { points: ["x", "y", "z"], image: { url: "nuevo.png" } },
  };
  const merged = mergeSettingValue(fallback, result);
  assert.deepEqual(merged, {
    points: ["x", "y", "z"],
    // Fusión SUPERFICIAL a propósito (comportamiento preexistente, no
    // "arreglado" en esta fase): "image" se reemplaza entero, no se
    // mergea con el "alt" del fallback.
    image: { url: "nuevo.png" },
    extra: "se conserva",
  });
});

test("mergeSettingValue: dos fallbacks DISTINTOS para la misma lectura cruda no se pisan entre sí", () => {
  // Simula a dos consumidores (ej. layout.tsx y mayorista/page.tsx)
  // pidiendo la misma key con fallbacks de forma distinta -- cada llamada
  // a mergeSettingValue es independiente y pura, así que el resultado de
  // una no puede filtrarse a la otra aunque comparta la misma lectura
  // cruda (lo que SÍ comparten, vía fetchSettingRaw memoizado por key).
  const sharedResult: SettingFetchResult = { found: true, value: { whatsappNumber: "595900000000" } };

  const fallbackA = { whatsappNumber: "", brandDescription: "A" };
  const fallbackB = { whatsappNumber: "", instagramUrl: "https://instagram.test/b" };

  const mergedA = mergeSettingValue(fallbackA, sharedResult);
  const mergedB = mergeSettingValue(fallbackB, sharedResult);

  assert.deepEqual(mergedA, { whatsappNumber: "595900000000", brandDescription: "A" });
  assert.deepEqual(mergedB, { whatsappNumber: "595900000000", instagramUrl: "https://instagram.test/b" });
  // Ninguno heredó campos del fallback del otro.
  assert.ok(!("instagramUrl" in mergedA));
  assert.ok(!("brandDescription" in mergedB));
});

test("mergeSettingValue: claves repetidas -- llamar dos veces con el MISMO resultado y fallback da el mismo objeto fusionado", () => {
  const fallback = { title: "Por defecto" };
  const result: SettingFetchResult = { found: true, value: { title: "Guardado" } };
  const first = mergeSettingValue(fallback, result);
  const second = mergeSettingValue(fallback, result);
  assert.deepEqual(first, second);
  // Fusión pura: no hay estado compartido ni efectos secundarios entre
  // llamadas repetidas (la deduplicación real de la CONSULTA vive en
  // fetchSettingRaw/React.cache(), no acá).
});
