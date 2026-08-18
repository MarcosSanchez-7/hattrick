import { getAllPatches } from "@/lib/data";
import { PatchForm } from "@/components/admin/PatchForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo parche" };

export default async function NewPatchPage() {
  const patches = await getAllPatches();
  const existingCategories = Array.from(
    new Set(patches.map((p) => p.category).filter((c): c is string => Boolean(c))),
  ).sort();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales/parches" label="Parches" />
        <span>/</span>
        <span>Nuevo</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nuevo parche
      </h1>
      <PatchForm existingCategories={existingCategories} />
    </>
  );
}
