// Pruebas automatizadas de lib/cart-reducer.ts usando el test runner nativo
// de Node (node:test / node:assert) -- cero dependencias nuevas, mismo
// patrón que lib/revalidate-core.test.ts y lib/shared-catalog-product.test.ts.
// Corre con: node --test lib/cart-reducer.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cartReducer,
  initialCartState,
  lineKey,
  availableStock,
  deriveCartLines,
  type CartState,
  type StoredLine,
} from "./cart-reducer.ts";
import type { SharedCatalogProduct } from "./shared-catalog-product.ts";

function product(overrides: Partial<SharedCatalogProduct> = {}): SharedCatalogProduct {
  return {
    id: "p1",
    slug: "camiseta-a",
    name: "Camiseta A",
    category: "futbol",
    price: 100000,
    compareAt: null,
    isNew: false,
    reviews: 0,
    variants: [
      { id: "v-m", size: "M", inStock: true },
      { id: "v-l", size: "L", inStock: false },
    ],
    sizes: ["M", "L"],
    soldOut: ["L"],
    colors: { primary: "#000", secondary: "#fff", accent: "#fff" },
    pattern: "solid",
    tags: [],
    images: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("add: primera unidad de un producto nuevo entra al carrito y produce un efecto 'add' con added=true", () => {
  const p = product();
  const next = cartReducer(initialCartState, { type: "add", id: 1, product: p, size: "M", qty: 1 });
  assert.equal(next.stored.length, 1);
  assert.equal(next.stored[0].qty, 1);
  assert.deepEqual(next.pendingEffects, [
    { id: 1, kind: "add", product: p, qty: 1, added: true, warning: null },
  ]);
});

test("add: dos despachos consecutivos sin re-render de por medio (mismo estado base) igual se acumulan correctamente", () => {
  // Simula el escenario de "múltiples add() en el mismo tick" encadenando
  // los reducers manualmente, como hace React con varias acciones en el
  // mismo batch -- sin ninguna lectura de variable externa mutada.
  const p = product();
  const s1 = cartReducer(initialCartState, { type: "add", id: 1, product: p, size: "M", qty: 1 });
  const s2 = cartReducer(s1, { type: "add", id: 2, product: p, size: "M", qty: 1 });
  assert.equal(s2.stored.length, 1);
  assert.equal(s2.stored[0].qty, 2);
  assert.equal(s2.pendingEffects.length, 2);
  assert.equal(s2.pendingEffects[0].id, 1);
  assert.equal(s2.pendingEffects[1].id, 2);
});

test("add: tope de stock cappea la cantidad y agrega un warning cuando se pide de más", () => {
  const p = product({
    variants: [{ id: "v-m", size: "M", inStock: true }],
  });
  const next = cartReducer(initialCartState, {
    type: "add",
    id: 1,
    product: p,
    size: "M",
    qty: 999,
  });
  assert.equal(next.stored[0].qty, 10); // MAX_CART_QTY
  const effect = next.pendingEffects[0];
  assert.equal(effect.kind, "add");
  if (effect.kind === "add") assert.ok(effect.warning);
});

test("add: talla agotada (max=0) no agrega la línea y added=false", () => {
  const p = product();
  const next = cartReducer(initialCartState, { type: "add", id: 1, product: p, size: "L", qty: 1 });
  assert.equal(next.stored.length, 0);
  const effect = next.pendingEffects[0];
  assert.equal(effect.kind, "add");
  if (effect.kind === "add") assert.equal(effect.added, false);
});

test("add: producto sin stock propio (variants undefined) no cappea nada más que MAX_CART_QTY", () => {
  const p = product({ variants: undefined });
  const next = cartReducer(initialCartState, {
    type: "add",
    id: 1,
    product: p,
    size: "M",
    qty: 5,
  });
  assert.equal(next.stored[0].qty, 5);
});

test("setQty: cambia la cantidad de la línea correspondiente sin tocar otras", () => {
  const stored: StoredLine[] = [
    { slug: "a", size: "M", qty: 1 },
    { slug: "b", size: "L", qty: 2 },
  ];
  const state: CartState = { stored, pendingEffects: [] };
  const key = lineKey("a", "M");
  const next = cartReducer(state, { type: "setQty", id: 1, key, qty: 3, resolved: new Map() });
  assert.equal(next.stored.find((l) => l.slug === "a")?.qty, 3);
  assert.equal(next.stored.find((l) => l.slug === "b")?.qty, 2);
});

test("setQty: qty <= 0 elimina la línea", () => {
  const stored: StoredLine[] = [{ slug: "a", size: "M", qty: 1 }];
  const state: CartState = { stored, pendingEffects: [] };
  const next = cartReducer(state, {
    type: "setQty",
    id: 1,
    key: lineKey("a", "M"),
    qty: 0,
    resolved: new Map(),
  });
  assert.equal(next.stored.length, 0);
});

test("setQty: cappea contra el stock resuelto y agrega un warning", () => {
  const p = product({ slug: "a", variants: [{ id: "v-m", size: "M", inStock: true }] });
  const state: CartState = { stored: [{ slug: "a", size: "M", qty: 1 }], pendingEffects: [] };
  const next = cartReducer(state, {
    type: "setQty",
    id: 1,
    key: lineKey("a", "M"),
    qty: 50,
    resolved: new Map([["a", p]]),
  });
  assert.equal(next.stored[0].qty, 10);
  assert.equal(next.pendingEffects.length, 1);
  assert.equal(next.pendingEffects[0].kind, "qty-warning");
});

test("setQty: sin producto resuelto (pending) no revienta, solo cappea contra MAX_CART_QTY", () => {
  const state: CartState = { stored: [{ slug: "a", size: "M", qty: 1 }], pendingEffects: [] };
  const next = cartReducer(state, {
    type: "setQty",
    id: 1,
    key: lineKey("a", "M"),
    qty: 999,
    resolved: new Map(),
  });
  assert.equal(next.stored[0].qty, 10);
});

test("remove: quita la línea y produce un efecto 'remove' con el nombre resuelto", () => {
  const p = product({ slug: "a" });
  const state: CartState = { stored: [{ slug: "a", size: "M", qty: 1 }], pendingEffects: [] };
  const next = cartReducer(state, {
    type: "remove",
    id: 1,
    key: lineKey("a", "M"),
    resolved: new Map([["a", p]]),
  });
  assert.equal(next.stored.length, 0);
  assert.deepEqual(next.pendingEffects, [{ id: 1, kind: "remove", productName: "Camiseta A" }]);
});

test("remove: producto no resuelto todavía -> productName null, no revienta", () => {
  const state: CartState = { stored: [{ slug: "a", size: "M", qty: 1 }], pendingEffects: [] };
  const next = cartReducer(state, {
    type: "remove",
    id: 1,
    key: lineKey("a", "M"),
    resolved: new Map(),
  });
  assert.deepEqual(next.pendingEffects, [{ id: 1, kind: "remove", productName: null }]);
});

test("clear: vacía stored sin tocar pendingEffects existentes", () => {
  const state: CartState = {
    stored: [{ slug: "a", size: "M", qty: 1 }],
    pendingEffects: [{ id: 1, kind: "remove", productName: null }],
  };
  const next = cartReducer(state, { type: "clear" });
  assert.equal(next.stored.length, 0);
  assert.equal(next.pendingEffects.length, 1);
});

test("flushEffects: quita solo los ids indicados", () => {
  const state: CartState = {
    stored: [],
    pendingEffects: [
      { id: 1, kind: "remove", productName: null },
      { id: 2, kind: "remove", productName: "x" },
    ],
  };
  const next = cartReducer(state, { type: "flushEffects", ids: [1] });
  assert.equal(next.pendingEffects.length, 1);
  assert.equal(next.pendingEffects[0].id, 2);
});

test("hydrate: reemplaza stored y limpia pendingEffects", () => {
  const state: CartState = {
    stored: [],
    pendingEffects: [{ id: 1, kind: "remove", productName: null }],
  };
  const stored: StoredLine[] = [{ slug: "a", size: "M", qty: 1 }];
  const next = cartReducer(state, { type: "hydrate", stored });
  assert.deepEqual(next.stored, stored);
  assert.equal(next.pendingEffects.length, 0);
});

test("el reducer es puro: la misma acción sobre el mismo estado produce el mismo resultado estructural (llamarlo dos veces, como hace StrictMode, es seguro)", () => {
  const p = product();
  const action = { type: "add" as const, id: 1, product: p, size: "M", qty: 1 };
  const r1 = cartReducer(initialCartState, action);
  const r2 = cartReducer(initialCartState, action);
  assert.deepEqual(r1, r2);
});

test("availableStock: talla inexistente en variants devuelve null", () => {
  const p = product();
  assert.equal(availableStock(p, "XL"), null);
});

test("deriveCartLines: producto resuelto -> status 'resolved' con lineTotal correcto", () => {
  const p = product({ price: 100000 });
  const stored: StoredLine[] = [{ slug: "camiseta-a", size: "M", qty: 2, addOnsPerUnit: 5000 }];
  const lines = deriveCartLines(
    stored,
    (slug) => (slug === "camiseta-a" ? p : undefined),
    () => false,
  );
  assert.equal(lines[0].status, "resolved");
  assert.equal(lines[0].product, p);
  assert.equal(lines[0].lineTotal, (100000 + 5000) * 2);
});

test("deriveCartLines: sin producto y no marcado unavailable -> 'pending', lineTotal 0", () => {
  const stored: StoredLine[] = [{ slug: "camiseta-a", size: "M", qty: 1 }];
  const lines = deriveCartLines(stored, () => undefined, () => false);
  assert.equal(lines[0].status, "pending");
  assert.equal(lines[0].product, null);
  assert.equal(lines[0].lineTotal, 0);
});

test("deriveCartLines: sin producto y marcado unavailable -> 'unavailable'", () => {
  const stored: StoredLine[] = [{ slug: "camiseta-a", size: "M", qty: 1 }];
  const lines = deriveCartLines(stored, () => undefined, () => true);
  assert.equal(lines[0].status, "unavailable");
  assert.equal(lines[0].product, null);
});

test("deriveCartLines: conserva slug/size/qty originales de StoredLine en cada línea", () => {
  const stored: StoredLine[] = [
    { slug: "a", size: "M", qty: 3, note: "Juan #10" },
  ];
  const lines = deriveCartLines(stored, () => undefined, () => false);
  assert.equal(lines[0].slug, "a");
  assert.equal(lines[0].size, "M");
  assert.equal(lines[0].qty, 3);
  assert.equal(lines[0].note, "Juan #10");
});
