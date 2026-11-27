import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { getCurrentAdmin } from "@/lib/admin-session";
import { hasPermission } from "@/lib/admin-auth";
import {
  projectVendedorInventoryProduct,
  projectViewerInventoryProduct,
} from "@/lib/admin-redact";
import { InventoryTable } from "@/components/admin/InventoryTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventario" };

export default async function AdminInventoryPage() {
  // Vendedor es un caso aparte, documentado en proxy.ts: su acceso a ESTA
  // página puntual no vive en la matriz de AdminPermission (ahí tiene
  // cero permisos a propósito) sino en la rama "vendedor" de proxy.ts, que
  // ya lo redirige acá desde cualquier otra ruta. Usar
  // requireAdminPageAccess("inventory.read") de forma estricta acá
  // provocaría un loop de redirección real (vendedor no tiene
  // inventory.read → rebota a "/gestion-ssjblue" → proxy.ts lo vuelve a
  // mandar a esta misma página → de nuevo sin el permiso...) -- confirmado
  // con una prueba de integración (run-admin-role-ui.mjs) antes de este
  // arreglo. Por eso el chequeo de esta página es manual, no el helper
  // genérico, con vendedor como excepción explícita.
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/gestion-ssjblue/login");
  if (admin.role !== "vendedor" && !hasPermission(admin.role, "inventory.read")) {
    redirect("/gestion-ssjblue");
  }
  const canWrite = hasPermission(admin.role, "inventory.write");
  const canReadMovements = hasPermission(admin.role, "inventory.movements.read");
  // "Solo lectura" acá cubre tanto a vendedor (ve solo esta página, nunca
  // la API) como a viewer (sí puede pegarle a la API con inventory.read,
  // pero nunca con .write) -- ambos ven la misma tabla sin acciones.
  const readOnly = !canWrite;
  // Vendedor usa esta página como su único rincón del panel (sin volver al
  // resto, sin breadcrumbs) -- viewer en cambio navega el panel normal,
  // solo sin poder editar nada acá. No confundir ambos casos.
  const isVendedorView = admin.role === "vendedor";

  const [products, categories] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
  ]);
  // No alcanza con esconderlo en la UI: si no puede escribir, el costo ni
  // siquiera viaja al navegador (no queda en el payload de la página para
  // inspeccionar) -- mismo criterio ya aplicado antes solo a "vendedor".
  // wholesalePrice se preserva SOLO para vendedor (su columna de precio
  // muestra justo eso, a propósito, sin relación con ser "sensible" para
  // ese rol puntual) -- viewer no debe recibirlo en absoluto.
  // No alcanza con ocultar datos en la UI: la proyección permitida se crea
  // antes de serializar props hacia el Client Component. Vendedor conserva
  // wholesalePrice por decisión comercial; viewer no lo recibe.
  const visibleProducts = readOnly
    ? products.map((product) =>
        isVendedorView
          ? projectVendedorInventoryProduct(product)
          : projectViewerInventoryProduct(product),
      )
    : products;

  return (
    <>
      {isVendedorView ? null : <AdminBackLink href="/gestion-ssjblue" label="Panel" />}
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Inventario</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            {readOnly
              ? "Stock actual por talla de cada producto — solo lectura."
              : "Crea, edita y elimina productos, y controlá el stock por talla de los de stock propio. Los de stock ajeno/importado no llevan cantidad, así que no tienen detalle de stock."}
          </p>
        </div>
        {isVendedorView ? null : (
          <div className="row gap-3">
            {canReadMovements ? (
              <Link href="/gestion-ssjblue/inventario/movimientos" className="btn btn--ghost btn--sm">
                Ver movimientos
              </Link>
            ) : null}
            {canWrite ? (
              <Link href="/gestion-ssjblue/productos/nuevo" className="btn btn--sm">
                Nuevo producto
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <InventoryTable
        products={visibleProducts}
        categories={categories}
        readOnly={readOnly}
        showWholesalePrice={isVendedorView}
      />
    </>
  );
}
