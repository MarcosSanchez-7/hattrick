import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-session";
import { decideAdminPermission, hasPermission, type AdminPermission } from "@/lib/admin-auth";
import type { AdminUser } from "@/lib/data";

/**
 * Fase 8B.2 -- capa única de autorización server-side, reemplaza las 12
 * copias textuales de "requireSuperadmin()" repartidas en app/api/admin/**
 * y agrega el chequeo que faltaba en el resto de las rutas (ver hallazgo
 * HIGH de la Fase 8A/8B.1: hasPermission() existía pero nunca se invocaba).
 *
 * getCurrentAdmin() (lib/admin-session.ts) ya hace lo que importa: decodifica
 * el JWT y FRESH -- sin cachear entre requests -- vuelve a consultar
 * admin_users por id (getAdminUserById). Eso resuelve, para TODO lo que pase
 * por acá, los dos problemas reales encontrados en 8B.1: (a) un usuario
 * eliminado deja de pasar en la primera solicitud siguiente, sin esperar a
 * que su JWT expire; (b) un cambio de rol (promoción o degradación) se
 * aplica también en la primera solicitud siguiente, porque el rol efectivo
 * se lee de la fila actual de la base, nunca del valor embebido en el JWT.
 *
 * getCurrentAdmin() no usa caché persistente: cada entrada protegida vuelve
 * a consultar admin_users. Eso prioriza la revocación/degradación efectiva
 * en la primera solicitud posterior sobre evitar una lectura adicional.
 */

export type AdminAuthFailure = {
  ok: false;
  status: 401 | 403 | 500;
  message: string;
};

export type AdminAuthSuccess = {
  ok: true;
  admin: AdminUser;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/** Nunca deja que un error de infraestructura (ej. Supabase caído) se
 * confunda con "no hay sesión" -- getCurrentAdmin() no atrapa errores por
 * su cuenta (ver lib/admin-session.ts), así que si getAdminUserById()
 * lanza, hay que decidir acá: denegar con 500 controlado, nunca dejar
 * pasar la operación protegida ni tratarlo como un 401 silencioso que
 * podría confundirse con "no logueado" en vez de "no se pudo verificar". */
async function resolveCurrentAdmin(): Promise<AdminUser | null | "infra-error"> {
  try {
    return await getCurrentAdmin();
  } catch (err) {
    console.error("No se pudo verificar la identidad administrativa:", err);
    return "infra-error";
  }
}

/** Núcleo del chequeo -- sin atar a ningún contrato de Next.js en particular,
 * así lo puede usar tanto una Route Handler (que devuelve NextResponse) como
 * una página de Server Component (que redirige). */
export async function checkAdminPermission(
  permission: AdminPermission,
): Promise<AdminAuthResult> {
  const admin = await resolveCurrentAdmin();

  const decision = decideAdminPermission(
    admin === "infra-error" ? "infra-error" : admin?.role ?? null,
    permission,
  );
  if (!decision.ok) return decision;
  // La rama exitosa exige una identidad real; este guard conserva el fail
  // closed si alguien modifica decideAdminPermission en el futuro.
  if (!admin || admin === "infra-error") {
    return { ok: false, status: 500, message: "No se pudo verificar tu sesión." };
  }
  return { ok: true, admin };
}

/** Para Route Handlers: `const check = await requireAdminPermission("x");
 * if ("error" in check) return check.error; const { admin } = check;` */
export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<{ admin: AdminUser } | { error: NextResponse }> {
  const result = await checkAdminPermission(permission);
  if (!result.ok) {
    return { error: NextResponse.json({ error: result.message }, { status: result.status }) };
  }
  return { admin: result.admin };
}

/**
 * HOF de denegación por defecto: envuelve un handler exportado para que sea
 * estructuralmente imposible registrar un método mutante sin declarar su
 * permiso -- a diferencia de "copiar y pegar el chequeo al principio", acá
 * un handler directamente no puede ejecutar nada sin pasar primero por
 * requireAdminPermission(). Compatible con firmas con o sin segundo
 * argumento (rutas estáticas vs. `{ params: Promise<...> }`).
 */
export function withAdminPermission<Ctx = undefined>(
  permission: AdminPermission,
  handler: (request: NextRequest, context: Ctx, admin: AdminUser) => Promise<NextResponse>,
): (request: NextRequest, context: Ctx) => Promise<NextResponse> {
  return async (request: NextRequest, context: Ctx): Promise<NextResponse> => {
    const check = await requireAdminPermission(permission);
    if ("error" in check) return check.error;
    return handler(request, context, check.admin);
  };
}

/**
 * Para operaciones técnicas de sesión que no son "comerciales" y no
 * corresponden a ningún AdminPermission -- hoy solo heartbeat. Exige
 * identidad válida (fresca contra la base, mismos dos casos de arriba)
 * pero ningún rol en particular: hasta vendedor puede pasar acá (y de
 * hecho ya puede, proxy.ts se lo permite explícitamente).
 */
export async function requireAnyAdmin(): Promise<{ admin: AdminUser } | { error: NextResponse }> {
  const admin = await resolveCurrentAdmin();
  if (admin === "infra-error") {
    return {
      error: NextResponse.json(
        { error: "No se pudo verificar tu sesión. Probá de nuevo en un momento." },
        { status: 500 },
      ),
    };
  }
  if (!admin) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  }
  return { admin };
}

/**
 * Para páginas de Server Component que deben estar completamente cerradas
 * a quien no tenga el permiso (ej. Finanzas, Usuarios, Configuración) --
 * redirige en vez de devolver JSON. Páginas que SÍ deben cargar para un rol
 * de solo lectura pero ocultar acciones (ej. Inventario para viewer) no
 * usan esto: siguen llamando a getCurrentAdmin() directo y deciden qué
 * renderizar con el rol ya en mano, igual que ya hace
 * app/gestion-ssjblue/(protected)/inventario/page.tsx con "vendedor".
 */
export async function requireAdminPageAccess(
  permission: AdminPermission,
  fallbackPath = "/gestion-ssjblue",
): Promise<AdminUser> {
  const admin = await resolveCurrentAdmin();
  if (admin === "infra-error" || !admin) {
    redirect("/gestion-ssjblue/login");
  }
  if (!hasPermission(admin.role, permission)) {
    redirect(fallbackPath);
  }
  return admin;
}
