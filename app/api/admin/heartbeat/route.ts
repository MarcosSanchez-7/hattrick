import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-session";
import { touchAdminLastSeen } from "@/lib/data";

/** Lo llama AdminHeartbeat.tsx cada ~60s mientras el panel esté abierto —
 * así el superadmin puede ver en Usuarios quién está conectado ahora. */
export async function POST() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  await touchAdminLastSeen(admin.id);
  return NextResponse.json({ ok: true });
}
