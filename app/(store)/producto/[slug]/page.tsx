import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  categoryPath,
  categorySlugPath,
  getProduct,
  isSoldOut,
  relatedTo,
  resolveCategoryNotices,
} from "@/lib/catalog";
import { getAllCategories, getAllProducts, getAllTags, getSetting } from "@/lib/data";
import {
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_PRODUCT_INFO,
  DEFAULT_PRODUCT_NOTICES,
} from "@/lib/settings";
import { SITE_NAME, SITE_URL, buildBreadcrumbJsonLd } from "@/lib/site";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductGrid } from "@/components/product/ProductCard";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(await getAllProducts(), slug);
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
  const [products, categories, tags, productNotices, productInfo, customBanner] =
    await Promise.all([
      getAllProducts(),
      getAllCategories(),
      getAllTags(),
      getSetting("productNotices", DEFAULT_PRODUCT_NOTICES),
      getSetting("productInfo", DEFAULT_PRODUCT_INFO),
      getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
    ]);
  const product = getProduct(products, slug);
  if (!product) notFound();

  const path = categoryPath(categories, product.category);
  const category = path[path.length - 1];
  const categoryHref = `/categoria/${categorySlugPath(categories, product.category).join("/")}`;
  const related = relatedTo(products, product);
  const notices = resolveCategoryNotices(
    categories,
    product.category,
    productNotices.defaultNotices,
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
        productInfo={productInfo}
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
