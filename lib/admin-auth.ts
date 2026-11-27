/**
 * Criptografía y roles del login de admin. Sin `server-only` a propósito:
 * lo importa proxy.ts, que corre por fuera del árbol de React — no puede
 * depender de next/headers ni de la base (ver lib/admin-session.ts para
 * eso). Nada de acá toca Supabase.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { jwtVerify, SignJWT } from "jose";

const SESSION_DURATION = "30d";
const SCRYPT_KEY_LENGTH = 64;

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno ADMIN_SESSION_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

// ── Contraseñas ─────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  return candidate.length === hashBuffer.length && timingSafeEqual(candidate, hashBuffer);
}

// ── Sesión (JWT en cookie) ──────────────────────────────────────────────

export type AdminRole = "superadmin" | "editor" | "viewer" | "vendedor";

/** Centralizado acá porque antes vivía triplicado (AdminShell,
 * AdminUsersTable, AdminUserForm) — un Record<AdminRole,...> obliga al
 * compilador a recordar cada lugar si se agrega un rol nuevo. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Superadmin",
  editor: "Editor",
  viewer: "Solo lectura",
  vendedor: "Vendedor",
};

export type AdminSessionPayload = {
  adminId: string;
  role: AdminRole;
};

export async function createAdminSessionToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

/** Solo verifica firma y expiración — chequeo optimista, sin tocar la base. */
export async function verifyAdminSessionToken(
  token: string,
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (typeof payload.adminId !== "string" || typeof payload.role !== "string") return null;
    return { adminId: payload.adminId, role: payload.role as AdminRole };
  } catch {
    return null;
  }
}

// ── Roles y permisos ────────────────────────────────────────────────────
// Fase 8B.2 -- matriz comercial confirmada por el propietario (ver
// docs/agents/HANDOFF.md). Un permiso por recurso+operación, nunca por
// método HTTP (un GET puede ser tan sensible como un POST -- ver
// "*.export"/"*.import", que son operaciones GET/POST distintas de
// "sales.read"/"sales.write" a propósito, no sinónimos).

export type AdminPermission =
  | "products.read"
  | "products.write"
  | "categories.read"
  | "categories.write"
  | "patches.read"
  | "patches.write"
  | "tags.read"
  | "tags.write"
  | "inventory.read"
  | "inventory.movements.read"
  | "inventory.write"
  | "pages.read"
  | "pages.write"
  | "qr.read"
  | "qr.write"
  | "sales.read"
  | "sales.write"
  | "sales.export"
  | "sales.import"
  | "customers.read"
  | "customers.write"
  | "suppliers.read"
  | "suppliers.write"
  | "uploads.write"
  | "settings.write"
  | "finance.access"
  | "users.manage";

/** Todos los permisos reales conocidos -- usado para rechazar un permiso
 * desconocido/mal tipeado en vez de dejarlo pasar por accidente (ver
 * hasPermission: un typo en el string literal de un endpoint nunca debe
 * resolver en "true"). */
export const ALL_ADMIN_PERMISSIONS: readonly AdminPermission[] = [
  "products.read",
  "products.write",
  "categories.read",
  "categories.write",
  "patches.read",
  "patches.write",
  "tags.read",
  "tags.write",
  "inventory.read",
  "inventory.movements.read",
  "inventory.write",
  "pages.read",
  "pages.write",
  "qr.read",
  "qr.write",
  "sales.read",
  "sales.write",
  "sales.export",
  "sales.import",
  "customers.read",
  "customers.write",
  "suppliers.read",
  "suppliers.write",
  "uploads.write",
  "settings.write",
  "finance.access",
  "users.manage",
];

const ALL_ADMIN_PERMISSIONS_SET = new Set<string>(ALL_ADMIN_PERMISSIONS);

/** Editor: lectura+escritura de catálogo/ventas/clientes/inventario/
 * páginas/QR/imágenes; solo LECTURA de proveedores (puede consultarlos
 * para asignar costos a un producto, nunca crearlos/editarlos/borrarlos);
 * sin acceso a configuración general, import/export de ventas, finanzas
 * ni gestión de usuarios -- decisión comercial explícita del propietario,
 * no una inferencia de este código. */
const EDITOR_PERMISSIONS = new Set<AdminPermission>([
  "products.read",
  "products.write",
  "categories.read",
  "categories.write",
  "patches.read",
  "patches.write",
  "tags.read",
  "tags.write",
  "inventory.read",
  "inventory.movements.read",
  "inventory.write",
  "pages.read",
  "pages.write",
  "qr.read",
  "qr.write",
  "sales.read",
  "sales.write",
  "customers.read",
  "customers.write",
  "suppliers.read",
  "uploads.write",
]);

/** Viewer: SOLO lectura de catálogo/inventario/páginas/QR -- nunca
 * ventas, clientes, proveedores, configuración, imágenes, import/export
 * ni usuarios (decisión comercial explícita; "solo lectura" no es "todo
 * en modo GET", es un subconjunto acotado de recursos). */
const VIEWER_PERMISSIONS = new Set<AdminPermission>([
  "products.read",
  "categories.read",
  "patches.read",
  "tags.read",
  "inventory.read",
  "pages.read",
  "qr.read",
]);

/** Vendedor: cero permisos de este mapa -- su único acceso real es la
 * página de Inventario (server-side, sin pasar por la API) y POST
 * /api/admin/heartbeat, ambos resueltos en proxy.ts/por fuera de este
 * sistema de permisos. Mantenerlo vacío es intencional, no un olvido. */
const ROLE_PERMISSIONS: Record<AdminRole, Set<AdminPermission> | "*"> = {
  superadmin: "*",
  editor: EDITOR_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
  vendedor: new Set([]),
};

/** Deniega por defecto ante cualquier entrada que no sea exactamente un
 * rol y un permiso conocidos -- un typo, un valor legado de un JWT viejo,
 * o un permiso que todavía no existe en ALL_ADMIN_PERMISSIONS nunca debe
 * resolver en acceso concedido. */
export function hasPermission(role: string, permission: string): boolean {
  if (!ALL_ADMIN_PERMISSIONS_SET.has(permission)) return false;
  const perms = ROLE_PERMISSIONS[role as AdminRole];
  if (!perms) return false;
  return perms === "*" || perms.has(permission as AdminPermission);
}

/** Decisión pura para cubrir identidades anómalas sin tocar la base. La
 * resolución fresca de la identidad sigue viviendo en admin-authorize.ts. */
export function decideAdminPermission(
  role: string | null | "infra-error",
  permission: AdminPermission,
): { ok: true } | { ok: false; status: 401 | 403 | 500; message: string } {
  if (role === "infra-error") {
    return {
      ok: false,
      status: 500,
      message: "No se pudo verificar tu sesión. Probá de nuevo en un momento.",
    };
  }
  if (!role) return { ok: false, status: 401, message: "No autorizado." };
  if (!hasPermission(role, permission)) {
    return { ok: false, status: 403, message: "No tenés permiso para esta acción." };
  }
  return { ok: true };
}
