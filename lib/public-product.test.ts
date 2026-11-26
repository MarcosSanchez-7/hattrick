import assert from "node:assert/strict";
import { test } from "node:test";
import type { Product, StockMode } from "./catalog.ts";
import {
  publicProductAvailability,
  toPublicPatch,
  toPublicProduct,
  type PublicProductSource,
} from "./public-product.ts";

function productFixture(
  stockMode: StockMode = "propio",
  overrides: Partial<Product> = {},
): Product {
  return {
    id: "p-public",
    slug: "camiseta-publica",
    name: "Camiseta pública",
    category: "futbol",
    price: 280000,
    compareAt: 320000,
    costPrice: 140000,
    wholesalePrice: 220000,
    isVisible: true,
    isNew: true,
    rating: 4.7,
    reviews: 12,
    stockMode,
    internalControl: false,
    variants: [
      { id: "v-p", size: "P", stock: 3 },
      { id: "v-m", size: "M", stock: 0 },
      { id: "v-xl", size: "XL", stock: 1 },
    ],
    sizes: stockMode === "propio" ? ["P", "M", "XL"] : [],
    soldOut: stockMode === "propio" ? ["M"] : [],
    createdAt: "2026-11-26T00:00:00.000Z",
    colors: { primary: "#111", secondary: "#eee", accent: "#c90" },
    pattern: "stripes",
    description: "Descripción pública",
    tags: ["liga"],
    images: ["/uploads/camiseta.webp"],
    isCustomizable: true,
    patches: [
      {
        id: "patch-visible",
        name: "Parche visible",
        images: ["/uploads/parche.webp"],
        price: 15000,
        isVisible: true,
        category: "Control interno",
        stock: 7,
      },
    ],
    suppliers: [{ supplierId: "s1", supplierName: "Proveedor interno", unitCost: 100000, quantity: 3 }],
    supplierSizeStock: [{ supplierId: "s1", supplierName: "Proveedor interno", size: "P", quantity: 3 }],
    ...overrides,
  };
}

test("stock propio conserva talles ordenados y disponibilidad sin cantidades", () => {
  const result = toPublicProduct(productFixture());

  assert.deepEqual(result.sizes, ["P", "M", "XL"]);
  assert.deepEqual(result.soldOut, ["M"]);
  assert.deepEqual(result.variants, [
    { id: "v-p", size: "P", inStock: true },
    { id: "v-m", size: "M", inStock: false },
    { id: "v-xl", size: "XL", inStock: true },
  ]);
  assert.equal("stock" in result.variants![0], false);
});

test("ajeno e importado mantienen consultar talle, incluso con control interno", () => {
  for (const stockMode of ["ajeno", "importado"] as const) {
    const result = toPublicProduct(productFixture(stockMode, { internalControl: true }));
    assert.equal(result.variants, undefined);
    assert.deepEqual(result.sizes, []);
    assert.deepEqual(result.soldOut, []);
  }
});

test("producto propio sin variantes conserva arrays vacíos", () => {
  const result = toPublicProduct(productFixture("propio", {
    variants: [],
    sizes: [],
    soldOut: [],
  }));
  assert.deepEqual(result.variants, []);
  assert.deepEqual(result.sizes, []);
  assert.deepEqual(result.soldOut, []);
});

test("la disponibilidad pública deriva las mismas tallas que Product administrativo", () => {
  const product = productFixture();
  const availability = publicProductAvailability(product.stockMode, product.variants!);
  const result = toPublicProduct(product);

  assert.deepEqual(availability.sizes, result.sizes);
  assert.deepEqual(availability.soldOut, result.soldOut);
  assert.deepEqual(availability.variants, result.variants);
});

test("PublicPatch conserva presentación y deriva disponibilidad sin stock ni categoría", () => {
  const available = toPublicPatch({
    id: "available",
    name: "Disponible",
    images: ["/p.webp"],
    price: 15000,
    isVisible: true,
    stock: 1,
  });
  const noStock = toPublicPatch({ ...available, isVisible: true, stock: 0 });
  const hidden = toPublicPatch({ ...available, isVisible: false, stock: 4 });

  assert.deepEqual(available, {
    id: "available",
    name: "Disponible",
    images: ["/p.webp"],
    price: 15000,
    isAvailable: true,
  });
  assert.equal(noStock.isAvailable, false);
  assert.equal(hidden.isAvailable, false);
  assert.equal("stock" in available, false);
  assert.equal("category" in available, false);
});

test("la proyección pública no conserva campos administrativos de Product", () => {
  const result = toPublicProduct(productFixture()) as Record<string, unknown>;
  for (const field of [
    "costPrice",
    "wholesalePrice",
    "internalControl",
    "stockMode",
    "suppliers",
    "supplierSizeStock",
  ]) {
    assert.equal(field in result, false, `${field} no debe cruzar al storefront`);
  }
});

test("PublicProductSource expresa el contrato de hidratación sin campos ficticios", () => {
  const product: PublicProductSource = {
    ...toPublicProduct(productFixture()),
    stockMode: "propio",
    variants: [{ id: "v", size: "M", stock: 1 }],
    patches: [{ id: "p", name: "P", images: [], price: 1, isVisible: true, stock: 1 }],
  };
  assert.equal(product.stockMode, "propio");
});
