// Pruebas automatizadas de lib/shared-catalog-product.ts usando el test
// runner nativo de Node (node:test / node:assert) -- cero dependencias
// nuevas, mismo patrón que lib/revalidate-core.test.ts.
// Corre con: node --test lib/shared-catalog-product.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toSharedCatalogProduct, type SharedCatalogProduct } from "./shared-catalog-product.ts";

/** Simula la forma de PublicProduct completo (lib/data.ts) -- incluye los
 * 5 campos que la proyección debe descartar (description/patches/
 * isVisible/rating/isCustomizable), además de los que sí debe conservar. */
function fullPublicProductFixture() {
  return {
    id: "p1",
    slug: "camiseta-a",
    name: "Camiseta A",
    category: "futbol",
    price: 190000,
    compareAt: 220000,
    isVisible: true,
    isNew: true,
    rating: 4.8,
    reviews: 12,
    variants: [{ id: "v1", size: "M", inStock: true }],
    sizes: ["M", "L"],
    soldOut: ["L"],
    colors: { primary: "#111111", secondary: "#f2f2f2", accent: "#d4af37" },
    pattern: "solid" as const,
    description: "Descripción larga del producto, varios párrafos...",
    tags: ["premier-league"],
    images: ["https://example.com/a.webp"],
    isCustomizable: true,
    patches: [{ id: "patch1", name: "Parche A", images: [], price: 15000 }],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

test("toSharedCatalogProduct conserva todos los campos que Cart/Navbar/Buscador necesitan", () => {
  const input = fullPublicProductFixture();
  const result = toSharedCatalogProduct(input);

  assert.equal(result.id, "p1");
  assert.equal(result.slug, "camiseta-a");
  assert.equal(result.name, "Camiseta A");
  assert.equal(result.category, "futbol");
  assert.equal(result.price, 190000);
  assert.equal(result.compareAt, 220000);
  assert.equal(result.isNew, true);
  assert.equal(result.reviews, 12);
  assert.deepEqual(result.variants, [{ id: "v1", size: "M", inStock: true }]);
  assert.deepEqual(result.sizes, ["M", "L"]);
  assert.deepEqual(result.soldOut, ["L"]);
  assert.deepEqual(result.colors, { primary: "#111111", secondary: "#f2f2f2", accent: "#d4af37" });
  assert.equal(result.pattern, "solid");
  assert.deepEqual(result.tags, ["premier-league"]);
  assert.deepEqual(result.images, ["https://example.com/a.webp"]);
  assert.equal(result.createdAt, "2026-01-01T00:00:00.000Z");
});

test("toSharedCatalogProduct elimina los campos que Cart/Navbar/Buscador no leen", () => {
  const input = fullPublicProductFixture();
  const result = toSharedCatalogProduct(input) as Record<string, unknown>;

  assert.equal("description" in result, false);
  assert.equal("patches" in result, false);
  assert.equal("isVisible" in result, false);
  assert.equal("rating" in result, false);
  assert.equal("isCustomizable" in result, false);
});

test("toSharedCatalogProduct conserva su forma con campos opcionales ausentes", () => {
  const input = {
    id: "p2",
    slug: "camiseta-b",
    name: "Camiseta B",
    category: "basket",
    price: 150000,
    compareAt: null,
    isVisible: true,
    reviews: 0,
    variants: undefined,
    sizes: [],
    soldOut: undefined,
    colors: { primary: "#000", secondary: "#fff", accent: "#fff" },
    pattern: "stripes" as const,
    description: "",
    tags: [],
    images: undefined,
    isCustomizable: false,
    patches: undefined,
    createdAt: "2026-02-01T00:00:00.000Z",
  };
  const result = toSharedCatalogProduct(input);
  assert.equal(result.compareAt, null);
  assert.equal(result.variants, undefined);
  assert.equal(result.soldOut, undefined);
  assert.equal(result.images, undefined);
  assert.equal(result.isNew, undefined);
});

test("toSharedCatalogProduct produce un objeto nuevo, no una referencia al input", () => {
  const input = fullPublicProductFixture();
  const result = toSharedCatalogProduct(input);
  assert.notEqual(result as unknown, input as unknown);
});

test("el tipo de salida satisface SharedCatalogProduct (chequeo de compilación)", () => {
  const input = fullPublicProductFixture();
  const result: SharedCatalogProduct = toSharedCatalogProduct(input);
  assert.ok(result.slug);
});
