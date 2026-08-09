import Link from "next/link";
import { isOnSale, isSoldOut, newArrivals } from "@/lib/catalog";
import { getAllCategories, getAllProducts } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product/ProductVisual";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel" };

export default async function AdminDashboard() {
  const [products, categories] = await Promise.all([
    getAllProducts({ includeHidden: true }),
    getAllCategories({ includeHidden: true }),
  ]);

  const onSale = products.filter(isOnSale).length;
  const soldOut = products.filter(isSoldOut).length;
  const nuevos = newArrivals(products).length;
  const recent = [...products].slice(-5).reverse();

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Panel</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Vista general de tu catálogo. Los datos se guardan en ficheros
            JSON locales hasta que conectemos una base de datos.
          </p>
        </div>
        <div className="row gap-3">
          <Link href="/admin/categorias/nueva" className="btn btn--ghost btn--sm">
            Nueva categoría
          </Link>
          <Link href="/admin/productos/nuevo" className="btn btn--sm">
            Nuevo producto
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__value">{products.length}</div>
          <div className="admin-stat__label">Productos totales</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{categories.length}</div>
          <div className="admin-stat__label">Categorías</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{onSale}</div>
          <div className="admin-stat__label">En oferta</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{soldOut}</div>
          <div className="admin-stat__label">Agotados</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card__head">
          <p className="h3" style={{ fontSize: "0.9375rem" }}>
            Últimos productos añadidos
          </p>
          <Link href="/admin/productos" className="section-head__link">
            Ver todos
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="admin-empty">
            Todavía no has añadido productos.{" "}
            <Link href="/admin/productos/nuevo" className="link-underline">
              Crea el primero
            </Link>
            .
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Novedad</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-table__product">
                        <div className="admin-table__thumb">
                          <ProductVisual
                            images={p.images}
                            colors={p.colors}
                            pattern={p.pattern}
                            uid={`dash-${p.id}`}
                            alt={p.name}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.team}</div>
                          <div className="meta">{p.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>{formatPrice(p.price)}</td>
                    <td>{p.isNew ? <span className="badge">Nuevo</span> : "—"}</td>
                    <td>
                      <Link
                        href={`/admin/productos/${p.id}`}
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nuevos === 0 || categories.length === 0 ? (
        <p className="admin-help" style={{ marginTop: 20 }}>
          Consejo: crea al menos una categoría antes de añadir productos.
        </p>
      ) : null}
    </>
  );
}
