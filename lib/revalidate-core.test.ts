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
  categoryHasStructuralChange,
  categoryPagePaths,
  computeProductOnlyPaths,
  computeRevalidationPaths,
  logRevalidationFailure,
  pageAffectsFooter,
  revalidateAfterWrite,
  settingsRevalidationEntries,
  type ProductListingRevalidation,
} from "./revalidate-core.ts";
import type { Category, Page } from "./catalog.ts";

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

test("importación CSV de ventas: una invalidación fallida no transforma una importación ya guardada en un error (Fase 4B.1)", async () => {
  // Reproduce la forma exacta de app/api/admin/sales/import/route.ts tras
  // la corrección: el resultado de la importación (con sus propios errores
  // por fila, si los hubo) ya está decidido ANTES de intentar invalidar --
  // revalidateAfterWrite nunca debe poder pisarlo, ni siquiera cuando el
  // resultado ya incluye errores parciales (filas inválidas del CSV, algo
  // normal y no relacionado con la invalidación).
  async function simulatedImportHandler(invalidateShouldFail: boolean) {
    const response = { imported: 3, errors: [{ row: 5, message: "Fecha inválida." }] };
    await revalidateAfterWrite("importar ventas históricas", async () => {
      if (invalidateShouldFail) throw new Error("revalidatePath explotó");
    });
    return response;
  }

  const originalError = console.error;
  console.error = () => {};
  try {
    const ok = await simulatedImportHandler(false);
    assert.deepEqual(ok, { imported: 3, errors: [{ row: 5, message: "Fecha inválida." }] });

    const okDespiteInvalidationFailure = await simulatedImportHandler(true);
    assert.deepEqual(okDespiteInvalidationFailure, {
      imported: 3,
      errors: [{ row: 5, message: "Fecha inválida." }],
    });
  } finally {
    console.error = originalError;
  }
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

// ── Fase 2: reglas de invalidación de categorías/páginas/settings ────────

test("categoryPagePaths expone la misma cadena raíz→hoja que ya usa computeRevalidationPaths", () => {
  assert.deepEqual(categoryPagePaths(CATEGORIES, "premier-league"), [
    "/categoria/futbol",
    "/categoria/futbol/europa",
    "/categoria/futbol/europa/premier-league",
  ]);
  assert.deepEqual(categoryPagePaths(CATEGORIES, "basket"), ["/categoria/basket"]);
  assert.deepEqual(categoryPagePaths(CATEGORIES, "no-existe"), []);
});

test("categoryHasStructuralChange: false cuando solo cambia algo cosmético", () => {
  const oldCat = category("europa", "futbol");
  const newCat: Category = { ...oldCat, tagline: "Nuevo tagline", description: "Nueva desc" };
  assert.equal(categoryHasStructuralChange(oldCat, newCat), false);
});

test("categoryHasStructuralChange: true si cambia el nombre", () => {
  const oldCat = category("europa", "futbol");
  const newCat: Category = { ...oldCat, name: "Europa (nuevo nombre)" };
  assert.equal(categoryHasStructuralChange(oldCat, newCat), true);
});

test("categoryHasStructuralChange: true si cambia la categoría padre (reubicación)", () => {
  const oldCat = category("europa", "futbol");
  const newCat: Category = { ...oldCat, parentSlug: "basket" };
  assert.equal(categoryHasStructuralChange(oldCat, newCat), true);
});

test("categoryHasStructuralChange: true si cambia la visibilidad", () => {
  const oldCat = category("europa", "futbol");
  const newCat: Category = { ...oldCat, isVisible: false };
  assert.equal(categoryHasStructuralChange(oldCat, newCat), true);
});

test("categoryHasStructuralChange: true (conservador) si no se pudo leer la categoría anterior", () => {
  const newCat = category("europa", "futbol");
  assert.equal(categoryHasStructuralChange(undefined, newCat), true);
});

function page(overrides: Partial<Page> = {}): Page {
  return {
    slug: "envios",
    title: "Envíos",
    body: "Texto original",
    placement: "ayuda",
    sortOrder: 0,
    ...overrides,
  };
}

test("pageAffectsFooter: false cuando solo cambia el contenido (body)", () => {
  const oldPage = page();
  const newPage = page({ body: "Texto corregido" });
  assert.equal(pageAffectsFooter(oldPage, newPage), false);
});

test("pageAffectsFooter: true si cambia el título", () => {
  const oldPage = page();
  const newPage = page({ title: "Envíos y entregas" });
  assert.equal(pageAffectsFooter(oldPage, newPage), true);
});

test("pageAffectsFooter: true si cambia el placement", () => {
  const oldPage = page();
  const newPage = page({ placement: "legal" });
  assert.equal(pageAffectsFooter(oldPage, newPage), true);
});

test("pageAffectsFooter: true si cambia el sortOrder", () => {
  const oldPage = page();
  const newPage = page({ sortOrder: 5 });
  assert.equal(pageAffectsFooter(oldPage, newPage), true);
});

test("pageAffectsFooter: true (conservador) si no se pudo leer la página anterior", () => {
  assert.equal(pageAffectsFooter(undefined, page()), true);
});

test("settingsRevalidationEntries: regla global devuelve el layout completo", () => {
  assert.deepEqual(settingsRevalidationEntries({ global: true }), [
    { path: "/", type: "layout" },
  ]);
});

test("settingsRevalidationEntries: regla de rutas puntuales", () => {
  assert.deepEqual(settingsRevalidationEntries({ paths: ["/", "/personalizacion"] }), [
    "/",
    "/personalizacion",
  ]);
});

test("settingsRevalidationEntries: regla sin páginas públicas (admin-only) devuelve lista vacía", () => {
  assert.deepEqual(settingsRevalidationEntries({ paths: [] }), []);
});

test("settingsRevalidationEntries: allProductPages agrega el patrón comodín de producto", () => {
  assert.deepEqual(
    settingsRevalidationEntries({ paths: ["/"], allProductPages: true }),
    ["/", { path: "/(store)/producto/[slug]", type: "page" }],
  );
});

// ── Verificación de Fase 2: parches no deben invalidar listados globales ──

test("computeProductOnlyPaths: solo fichas de producto, sin globales ni categoría", () => {
  const paths = computeProductOnlyPaths(["camiseta-a", "camiseta-b"]);
  assert.deepEqual(paths, ["/producto/camiseta-a", "/producto/camiseta-b"]);
  // A diferencia de computeRevalidationPaths, nunca debe incluir "/",
  // "/novedades" ni "/ofertas" -- un parche no aparece en esos listados.
  assert.equal(paths.includes("/"), false);
  assert.equal(paths.includes("/novedades"), false);
  assert.equal(paths.includes("/ofertas"), false);
});

test("computeProductOnlyPaths: deduplica slugs repetidos", () => {
  assert.deepEqual(computeProductOnlyPaths(["a", "b", "a"]), ["/producto/a", "/producto/b"]);
});

test("computeProductOnlyPaths: lote vacío devuelve lista vacía", () => {
  assert.deepEqual(computeProductOnlyPaths([]), []);
});
