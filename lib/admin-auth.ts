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

export type AdminRole = "superadmin" | "editor" | "viewer";

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
// Hoy solo hay superadmins reales en uso; este mapa queda listo para que,
// cuando se necesite un segundo rol de verdad, alcance con sumar permisos
// acá — sin tocar el esquema ni el resto de las rutas ya existentes.

export type AdminPermission =
  | "products.write"
  | "categories.write"
  | "sales.write"
  | "settings.write"
  | "users.manage";

const ROLE_PERMISSIONS: Record<AdminRole, Set<AdminPermission> | "*"> = {
  superadmin: "*",
  editor: new Set(["products.write", "categories.write", "sales.write", "settings.write"]),
  viewer: new Set([]),
};

export function hasPermission(role: AdminRole, permission: AdminPermission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms === "*" || perms.has(permission);
}
