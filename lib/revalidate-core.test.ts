// Pruebas automatizadas de lib/revalidate-core.ts usando el test runner
// nativo de Node (node:test / node:assert) -- cero dependencias nuevas.
// Corre con: node --test lib/revalidate-core.test.ts
//
// Solo importa este módulo (sin alias "@/", con extensión .ts explícita
// porque Node ESM lo exige) -- no toca Supabase, next/cache ni nada que
// requiera un request real de Next.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeRevalidationPaths,
  logRevalidationFailure,
  revalidateAfterWrite,
  type ProductListingRevalidation,
} from "./revalidate-core.ts";
import type { Category } from "./catalog.ts";

function category(slug: string, parentSlug: string | null = null): Category {
  return {
    slug,
    name: slug,
    tagline: "",
    description: "",
    image: null,
    isVisible: true,
    parentSlug,
    notices: null,
    shippingText: null,
  };
}

// futbol (raíz)
//   ├─ europa
//   │    └─ premier-league
//   └─ sudamerica
// basket (raíz, sin relación con futbol)
const CATEGORIES: Category[] = [
  category("futbol"),
  category("europa", "futbol"),
  category("premier-league", "europa"),
  category("sudamerica", "futbol"),
  category("basket"),
];

function globals(): string[] {
  return ["/", "/novedades", "/ofertas"];
}

test("producto individual en una categoría raíz", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "camiseta-basket", categorySlugs: ["basket"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [...globals(), "/producto/camiseta-basket", "/categoria/basket"]);
});

test("categoría con múltiples ancestros invalida toda la cadena raíz→hoja", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "jersey-premier", categorySlugs: ["premier-league"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [
    ...globals(),
    "/producto/jersey-premier",
    "/categoria/futbol",
    "/categoria/futbol/europa",
    "/categoria/futbol/europa/premier-league",
  ]);
});

test("cambio de categoría invalida la cadena anterior y la nueva", () => {
  // Un producto que se mueve de "sudamerica" a "europa" -- ambas cuelgan
  // de "futbol", así que esa página de padre debe aparecer una sola vez.
  const input: ProductListingRevalidation[] = [
    { slug: "camiseta-movida", categorySlugs: ["sudamerica", "europa"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [
    ...globals(),
    "/producto/camiseta-movida",
    "/categoria/futbol",
    "/categoria/futbol/sudamerica",
    "/categoria/futbol/europa",
  ]);
});

test("cambio de slug invalida la URL anterior y la nueva", () => {
  // Mismo producto conceptual, dos slugs -- lo que hace el handler de PUT
  // cuando el admin edita el campo "URL (slug)".
  const input: ProductListingRevalidation[] = [
    { slug: "olimpia-2026", categorySlugs: ["basket"] },
    { slug: "olimpia-alternativa-2026", categorySlugs: ["basket"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [
    ...globals(),
    "/producto/olimpia-2026",
    "/categoria/basket",
    "/producto/olimpia-alternativa-2026",
  ]);
});

test("múltiples productos de una venta, cada uno en su categoría", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "a", categorySlugs: ["basket"] },
    { slug: "b", categorySlugs: ["sudamerica"] },
    { slug: "c", categorySlugs: ["premier-league"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [
    ...globals(),
    "/producto/a",
    "/categoria/basket",
    "/producto/b",
    "/categoria/futbol",
    "/categoria/futbol/sudamerica",
    "/producto/c",
    "/categoria/futbol/europa",
    "/categoria/futbol/europa/premier-league",
  ]);
});

test("categorías compartidas entre productos se invalidan una sola vez", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "a", categorySlugs: ["europa"] },
    { slug: "b", categorySlugs: ["europa"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  const categoriaPaths = paths.filter((p) => p.startsWith("/categoria/"));
  assert.deepEqual(categoriaPaths, ["/categoria/futbol", "/categoria/futbol/europa"]);
  // Cada camino de categoría aparece una sola vez en todo el resultado.
  assert.equal(new Set(paths).size, paths.length);
});

test("deduplica rutas de producto repetidas dentro del mismo lote", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "a", categorySlugs: ["basket"] },
    { slug: "a", categorySlugs: ["basket"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.equal(paths.filter((p) => p === "/producto/a").length, 1);
  assert.equal(new Set(paths).size, paths.length);
});

test("categoría inexistente no rompe y no agrega rutas fantasma", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "huerfano", categorySlugs: ["esta-no-existe"] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [...globals(), "/producto/huerfano"]);
});

test("categorySlugs con null/undefined se ignoran sin romper", () => {
  const input: ProductListingRevalidation[] = [
    { slug: "sin-categoria", categorySlugs: [null, undefined] },
  ];
  const paths = computeRevalidationPaths(input, CATEGORIES);
  assert.deepEqual(paths, [...globals(), "/producto/sin-categoria"]);
});

test("lote vacío no devuelve ninguna ruta (ni siquiera los globales)", () => {
  assert.deepEqual(computeRevalidationPaths([], CATEGORIES), []);
});

test("revalidateAfterWrite: la escritura ya fue exitosa, un fallo de invalidación se traga y se loguea", async () => {
  const originalError = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };
  try {
    await assert.doesNotReject(() =>
      revalidateAfterWrite("contexto de prueba", async () => {
        throw new Error("fallo simulado de revalidatePath");
      }),
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.match(String(logged[0]), /contexto de prueba/);
  assert.match(String(logged[0]), /fallo simulado de revalidatePath/);
});

test("revalidateAfterWrite: un fallo en las consultas auxiliares (no solo en revalidatePath) también se traga", async () => {
  await assert.doesNotReject(() =>
    revalidateAfterWrite("resolver slugs", async () => {
      // Simula que la consulta que busca slug/categoría por id (la
      // "consulta auxiliar" posterior a la escritura) es la que falla,
      // antes de siquiera llegar a llamar revalidatePath.
      throw new Error("Supabase no respondió");
    }),
  );
});

test("revalidateAfterWrite: si no hay error, no logueá nada", async () => {
  const originalError = console.error;
  let called = false;
  console.error = () => {
    called = true;
  };
  try {
    await revalidateAfterWrite("caso feliz", async () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(called, false);
});

test("patrón de los route handlers: si la escritura falla, la invalidación nunca se ejecuta", async () => {
  // Reproduce la forma exacta de los handlers tocados en esta fase: un
  // primer bloque que puede fallar (la escritura real) seguido de un
  // segundo paso de invalidación que solo se alcanza si el primero NO
  // tiró. No ejercita los route handlers reales (eso requeriría mockear
  // next/server y Supabase), pero sí el control de flujo que los 5
  // comparten.
  let invalidateWasCalled = false;
  async function simulatedHandler(writeShouldFail: boolean) {
    let wroteOk: string;
    try {
      if (writeShouldFail) throw new Error("fallo de escritura simulado");
      wroteOk = "id-123";
    } catch {
      return { status: 500 as const };
    }
    await revalidateAfterWrite("handler simulado", async () => {
      invalidateWasCalled = true;
    });
    return { status: 201 as const, id: wroteOk };
  }

  const failed = await simulatedHandler(true);
  assert.equal(failed.status, 500);
  assert.equal(invalidateWasCalled, false);

  const ok = await simulatedHandler(false);
  assert.equal(ok.status, 201);
  assert.equal(invalidateWasCalled, true);
});

test("logRevalidationFailure solo loguea el mensaje del error, no el stack ni otras propiedades", () => {
  const originalError = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const err = new Error("stock_on_hand violado");
    logRevalidationFailure("contexto de prueba", err);
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  const [, loggedValue] = logged[0] as [string, unknown];
  assert.equal(loggedValue, "stock_on_hand violado");
});
