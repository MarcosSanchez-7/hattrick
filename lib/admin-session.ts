import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
  type AdminRole,
} from "@/lib/admin-auth";
import { getAdminUserById, type AdminUser } from "@/lib/data";

const COOKIE_NAME = "hattrick_admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export async function setAdminSessionCookie(adminId: string, role: AdminRole) {
  const token = await createAdminSessionToken({ adminId, role });
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Chequeo autoritativo: además de validar el JWT, confirma contra la base
 * que el admin sigue existiendo (por si se borró con la sesión todavía
 * vigente). Memoizado por request — se puede llamar varias veces sin
 * repetir la consulta.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyAdminSessionToken(token);
  if (!payload) return null;

  return getAdminUserById(payload.adminId);
});
