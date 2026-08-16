import { notFound } from "next/navigation";
import { getAllPatches } from "@/lib/data";
import { PatchForm } from "@/components/admin/PatchForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

type Params = { id: string };

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar parche" };

export default async function EditPatchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const patches = await getAllPatches();
  const patch = patches.find((p) => p.id === id);
  if (!patch) notFound();

  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <AdminBackLink href="/gestion-ssjblue/generales/parches" label="Parches" />
        <span>/</span>
        <span>{patch.name}</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Editar parche
      </h1>
      <PatchForm patch={patch} />
    </>
  );
}
