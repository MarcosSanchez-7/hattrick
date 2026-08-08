import Link from "next/link";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata = { title: "Nueva categoría" };

export default function NewCategoryPage() {
  return (
    <>
      <nav className="breadcrumbs" aria-label="Migas de pan" style={{ marginBottom: 16 }}>
        <Link href="/admin/categorias">Categorías</Link>
        <span>/</span>
        <span>Nueva</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>
        Nueva categoría
      </h1>
      <CategoryForm />
    </>
  );
}
