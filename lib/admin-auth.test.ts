// Fase 8B.2 -- matriz de permisos de lib/admin-auth.ts. Pruebas puras
// (node:test / node:assert), sin Supabase ni next/headers -- lo que
// depende de una sesión real (identidad ausente, usuario eliminado,
// permisos insuficientes/válidos contra un servidor real) se cubre en
// tests/integration/run-admin-authorization.mjs, no acá.
// Corre con: node --test lib/admin-auth.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ADMIN_PERMISSIONS,
  decideAdminPermission,
  hasPermission,
  ROLE_LABELS,
  type AdminRole,
} from "./admin-auth.ts";

const ROLES: AdminRole[] = ["superadmin", "editor", "viewer", "vendedor"];

// Matriz comercial confirmada por el propietario (Fase 8B.2, bloque 1/4) --
// explícita acá para que cualquier cambio futuro al mapa real de
// lib/admin-auth.ts tenga que pasar por esta prueba a propósito.
const EXPECTED: Record<AdminRole, Set<string> | "*"> = {
  superadmin: "*",
  editor: new Set([
    "products.read", "products.write",
    "categories.read", "categories.write",
    "patches.read", "patches.write",
    "tags.read", "tags.write",
    "inventory.read", "inventory.movements.read", "inventory.write",
    "pages.read", "pages.write",
    "qr.read", "qr.write",
    "sales.read", "sales.write",
    "customers.read", "customers.write",
    "suppliers.read",
    "uploads.write",
  ]),
  viewer: new Set([
    "products.read",
    "categories.read",
    "patches.read",
    "tags.read",
    "inventory.read",
    "pages.read",
    "qr.read",
  ]),
  vendedor: new Set([]),
};

test("matriz completa: cada rol tiene exactamente los permisos esperados, ni más ni menos", () => {
  for (const role of ROLES) {
    const expected = EXPECTED[role];
    for (const permission of ALL_ADMIN_PERMISSIONS) {
      const actual = hasPermission(role, permission);
      const shouldHave = expected === "*" || expected.has(permission);
      assert.equal(
        actual,
        shouldHave,
        `${role} x ${permission}: esperado ${shouldHave}, obtenido ${actual}`,
      );
    }
  }
});

test("superadmin tiene literalmente todos los permisos conocidos (comodín, no una lista larga)", () => {
  for (const permission of ALL_ADMIN_PERMISSIONS) {
    assert.equal(hasPermission("superadmin", permission), true);
  }
});

test("editor NO tiene permisos reservados a superadmin (finance.access, users.manage, settings.write) ni los de escritura excluidos explícitamente (suppliers.write, sales.import, sales.export)", () => {
  for (const permission of [
    "finance.access",
    "users.manage",
    "settings.write",
    "suppliers.write",
    "sales.import",
    "sales.export",
  ] as const) {
    assert.equal(hasPermission("editor", permission), false, permission);
  }
});

test("viewer no tiene NINGÚN permiso de escritura, ni acceso a ventas/clientes/proveedores/configuración/imágenes", () => {
  for (const permission of ALL_ADMIN_PERMISSIONS) {
    if (permission.endsWith(".write") || permission.endsWith(".import") || permission.endsWith(".export")) {
      assert.equal(hasPermission("viewer", permission), false, permission);
    }
  }
  for (const permission of [
    "sales.read",
    "customers.read",
    "suppliers.read",
    "settings.write",
    "finance.access",
    "users.manage",
    "uploads.write",
  ] as const) {
    assert.equal(hasPermission("viewer", permission), false, permission);
  }
});

test("vendedor no tiene ningún permiso de este mapa (su acceso real vive en proxy.ts, no acá)", () => {
  for (const permission of ALL_ADMIN_PERMISSIONS) {
    assert.equal(hasPermission("vendedor", permission), false, permission);
  }
});

test("rol desconocido/inválido: deniega por defecto para cualquier permiso real", () => {
  for (const permission of ALL_ADMIN_PERMISSIONS) {
    assert.equal(hasPermission("superadministrador", permission), false);
    assert.equal(hasPermission("", permission), false);
    assert.equal(hasPermission("ADMIN", permission), false);
  }
});

test("permiso desconocido/inválido: deniega por defecto para cualquier rol real, incluido superadmin", () => {
  for (const role of ROLES) {
    assert.equal(hasPermission(role, "products.delete-everything"), false);
    assert.equal(hasPermission(role, ""), false);
    assert.equal(hasPermission(role, "products.READ"), false);
  }
});

test("ROLE_LABELS cubre exactamente los 4 roles reales, sin huérfanos", () => {
  assert.deepStrictEqual(Object.keys(ROLE_LABELS).sort(), [...ROLES].sort());
});

test("ALL_ADMIN_PERMISSIONS no tiene duplicados", () => {
  assert.equal(ALL_ADMIN_PERMISSIONS.length, new Set(ALL_ADMIN_PERMISSIONS).size);
});

test("dobles controlados: rol desconocido y fallo de identidad se deniegan antes de autorizar", () => {
  const unknownRole = decideAdminPermission("rol-legado", "products.read");
  assert.deepEqual(unknownRole, {
    ok: false,
    status: 403,
    message: "No tenés permiso para esta acción.",
  });
  const infrastructureFailure = decideAdminPermission("infra-error", "products.read");
  assert.equal(infrastructureFailure.ok, false);
  if (!infrastructureFailure.ok) assert.equal(infrastructureFailure.status, 500);
});
