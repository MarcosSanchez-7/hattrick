import Link from "next/link";
import { getAllPages } from "@/lib/data";
import { PagesTable } from "@/components/admin/PagesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Páginas" };

export default async function AdminPagesPage() {
  const pages = await getAllPages();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Páginas</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Términos, privacidad, envíos, contacto y demás textos que
            aparecen en el footer. Si borrás una, su enlace desaparece del
            footer.
          </p>
        </div>
        <Link href="/gestion-ssjblue/paginas/nueva" className="btn btn--sm">
          Nueva página
        </Link>
      </div>

      <PagesTable pages={pages} />
    </>
  );
}
