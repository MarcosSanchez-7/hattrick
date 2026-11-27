import { NextResponse } from "next/server";
import { touchAdminLastSeen } from "@/lib/data";
import { requireAnyAdmin } from "@/lib/admin-authorize";

/** Lo llama AdminHeartbeat.tsx cada ~60s mientras el panel esté abierto --
 * así el superadmin puede ver en Usuarios quién está conectado ahora.
 * Operación técnica de sesión, no comercial -- exige identidad válida
 * (fresca contra la base) pero ningún permiso en particular, igual que
 * ya permite proxy.ts incluso para "vendedor". */
export async function POST() {
  const check = await requireAnyAdmin();
  if ("error" in check) return check.error;

  await touchAdminLastSeen(check.admin.id);
  return NextResponse.json({ ok: true });
}
