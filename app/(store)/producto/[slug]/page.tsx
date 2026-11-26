import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  categoryPath,
  categorySlugPath,
  isSoldOut,
  relatedTo,
  resolveCategoryNotices,
  resolveCategoryShippingText,
} from "@/lib/catalog";
import {
  getAllCategories,
  getAllTags,
  getProductBySlug,
  getProductsByIds,
  getRelatedCandidates,
  getSetting,
  getSitemapProducts,
  toPublicProduct,
} from "@/lib/data";
import {
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_PRODUCT_INFO,
  DEFAULT_PRODUCT_NOTICES,
} from "@/lib/settings";
import { SITE_NAME, SITE_URL, buildBreadcrumbJsonLd } from "@/lib/site";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductGrid } from "@/components/product/ProductCard";

type Params = { slug: string };

// Fase 4C: 900s -- precio/stock/visibilidad/slug ya invalidan la ficha on
// demand en cada escritura (revalidateProduct/revalidateProductListings,
// ver lib/revalidate.ts), confirmado con los 28 escenarios de integración
// de la Fase 4B.3. El TTL es respaldo, no la vía principal.
export const revalidate = 900;

// Sin esto, revalidate=900 no hace nada en un segmento dinamico ([slug]) --
// Next.js sigue tratando la ruta como 100% dinamica (sin cache real) si no
// sabe de antemano que paths existen. Con esto, cada producto se pre-renderiza
// en el build y despues se revalida cada 900s (ISR real), en vez de correr la
// consulta a Supabase en cada visita.
//
// Fase 7B.3-B: antes pedía getAllProducts() (catálogo completo + las 4
// relaciones de TODOS los productos) solo para mapear a {slug}. Acá
// alcanza con slug -- getSitemapProducts() (app/sitemap.ts la usa con el
// mismo criterio) ya filtra exactamente igual (is_visible propio +
// cascada de categoría oculta, mismo orden created_at ASC) sin pedir
// variantes/parches/proveedores/precio/etc. de nadie.
export async function generateStaticParams() {
  const products = await getSitemapProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Misma función que el cuerpo de la página (abajo) -- memoizada por
  // request con la clave `slug`, así que pedirla aca Y en el body no
  // duplica la consulta real: comparten el mismo resultado cacheado
  // dentro de un mismo render/regeneración (confirmado por medición, Fase
  // 7B.3-B). Una proyección "solo metadata" más chica rompería ese
  // compartido -- sería una clave de caché distinta, sumando una consulta
  // en vez de ahorrarla.
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };
  const image = product.images?.[0];
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      url: `${SITE_URL}/producto/${product.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: image
      ? { card: "summary_large_image", images: [image] }
      : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [fullProduct, categories, tags, productNotices, productInfo, customBanner] =
    await Promise.all([
      getProductBySlug(slug),
      getAllCategories(),
      getAllTags(),
      getSetting("productNotices", DEFAULT_PRODUCT_NOTICES),
      getSetting("productInfo", DEFAULT_PRODUCT_INFO),
      getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
    ]);
  if (!fullProduct) notFound();

  const path = categoryPath(categories, fullProduct.category);
  const category = path[path.length - 1];
  const categoryHref = `/categoria/${categorySlugPath(categories, fullProduct.category).join("/")}`;
  // Fase 7B.3-B: ya no se trae el catálogo completo con todas sus
  // relaciones para elegir hasta 4 relacionados -- se selecciona con una
  // proyección liviana (RelatedCandidate: id/slug/category/tags/createdAt,
  // mismo universo visible y mismo orden created_at ASC que antes) y
  // SOLO se hidratan (variantes/parches/proveedores/stock) los ya
  // elegidos. relatedTo() no cambió de algoritmo, solo de qué tipos acepta
  // (ver lib/catalog.ts) -- la selección y el orden final son idénticos a
  // los que daba sobre el catálogo completo.
  const candidates = await getRelatedCandidates();
  const selectedCandidates = relatedTo(candidates, fullProduct);
  const relatedProducts = await getProductsByIds(selectedCandidates.map((c) => c.id));
  // ProductDetail y ProductGrid son Client Components -- se mapea a la
  // versión pública antes de pasarla en vez del Product completo (ver
  // toPublicProduct en lib/data.ts).
  const related = relatedProducts.map(toPublicProduct);
  const product = toPublicProduct(fullProduct);
  const notices = resolveCategoryNotices(
    categories,
    product.category,
    productNotices.defaultNotices,
  );
  const shippingText = resolveCategoryShippingText(
    categories,
    product.category,
    productInfo.shippingText,
  );

  const productUrl = `${SITE_URL}/producto/${product.slug}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.length ? product.images : undefined,
    sku: product.id,
    url: productUrl,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "PYG",
      price: product.price,
      availability: isSoldOut(product)
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Inicio", url: SITE_URL },
    ...path.map((c) => ({
      name: c.name,
      url: `${SITE_URL}/categoria/${categorySlugPath(categories, c.slug).join("/")}`,
    })),
    { name: product.name },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify de datos del propio catálogo (no de input de usuario);
        // igual se escapa "<" para que un nombre/descr. con "</script>" no
        // pueda romper el tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="container" style={{ paddingTop: 24 }}>
        <nav className="breadcrumbs" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          {path.map((c) => (
            <Fragment key={c.slug}>
              <span>/</span>
              <Link href={`/categoria/${categorySlugPath(categories, c.slug).join("/")}`}>
                {c.name}
              </Link>
            </Fragment>
          ))}
          <span>/</span>
          <span>{product.name}</span>
        </nav>
      </div>

      <ProductDetail
        product={product}
        notices={notices}
        productInfo={{ ...productInfo, shippingText }}
        personalizationPrice={customBanner.price}
      />

      {related.length > 0 ? (
        <section className="section section--soft">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="label section-head__eyebrow">
                  También te puede interesar
                </span>
                <h2 className="h1">Completa tu equipación</h2>
              </div>
              <Link href={categoryHref} className="section-head__link">
                Ver {category?.name}
              </Link>
            </div>
            <ProductGrid products={related} tags={tags} />
          </div>
        </section>
      ) : null}
    </>
  );
}
