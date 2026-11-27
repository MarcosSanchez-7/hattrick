import Link from "next/link";
import { getAllPatches } from "@/lib/data";
import { PatchesTable } from "@/components/admin/PatchesTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { requireAdminPageAccess } from "@/lib/admin-authorize";
import { hasPermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parches" };

export default async function PatchesPage() {
  const admin = await requireAdminPageAccess("patches.read");
  const canWrite = hasPermission(admin.role, "patches.write");

  const patches = await getAllPatches();

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue/generales" label="Generales" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Parches</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Parches de ligas y competiciones, con su precio adicional. Al
            cargar un producto, elegís a mano cuáles de estos parches se le
            pueden poner.
          </p>
        </div>
        {canWrite ? (
          <Link href="/gestion-ssjblue/generales/parches/nueva" className="btn btn--sm">
            Nuevo parche
          </Link>
        ) : null}
      </div>

      <PatchesTable patches={patches} readOnly={!canWrite} />
    </>
  );
}
