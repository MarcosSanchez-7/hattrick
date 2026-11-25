import { Toaster } from "sonner";
import { getAllCategories, getAllPages, getSetting } from "@/lib/data";
import { DEFAULT_BRANDING, DEFAULT_FOOTER, DEFAULT_NAVBAR, DEFAULT_WHOLESALE } from "@/lib/settings";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { WhatsAppTeaser } from "@/components/layout/WhatsAppTeaser";

// Fase 4C: 86400s (24h) -- Navbar/Footer/branding/categorías/settings ya
// dependen de invalidación bajo demanda (revalidatePath global en cada
// escritura relevante, ver lib/revalidate.ts), nunca del TTL, para
// reflejar cambios administrativos -- confirmado con los 28 escenarios de
// integración de la Fase 4B.3. Este valor es solo la red de respaldo para
// el caso (raro) de que esa invalidación falle en silencio.
//
// No hace falta que coincida con el de las páginas hijas: gana el valor
// MÁS BAJO de toda la jerarquía layout+página (confirmado leyendo
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
// en la Fase 4A) -- un layout en 86400s con una página hija en 300s sigue
// revalidando esa ruta cada 300s real. El layout en un valor alto no
// "apaga" el TTL más corto de ninguna página; solo deja de ser ÉL el
// cuello de botella en las rutas que ya tienen su propio valor más bajo.
export const revalidate = 86400;

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Ni Navbar (Fase 3B/3C) ni ningún otro consumidor de este layout
  // necesita ya el catálogo completo -- cada página que sí lo necesita
  // para su propio contenido (home, categoría, producto, novedades,
  // ofertas) lo pide por su cuenta vía getAllProducts()/
  // getAllPublicProducts(), memoizadas por request con React.cache() (ver
  // Fase 3D). Pedirlo también acá era trabajo repetido sin ningún
  // consumidor real.
  const [categories, pages, navbarSettings, footerSettings, branding, wholesaleSettings] =
    await Promise.all([
      getAllCategories(),
      getAllPages(),
      getSetting("navbar", DEFAULT_NAVBAR),
      getSetting("footer", DEFAULT_FOOTER),
      getSetting("branding", DEFAULT_BRANDING),
      getSetting("wholesale", DEFAULT_WHOLESALE),
    ]);

  const sameAs = [
    footerSettings.instagramUrl,
    footerSettings.tiktokUrl,
    footerSettings.xUrl,
    footerSettings.youtubeUrl,
  ].filter(Boolean);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: footerSettings.brandDescription,
    // Solo si ya subieron un logo real desde Generales -> Branding — el
    // ícono genérico "H" no cuenta como logo de marca.
    ...(branding.faviconUrl ? { logo: branding.faviconUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/buscar?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <CartProvider>
      <WishlistProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <AnnouncementBar items={navbarSettings.announcements} />
        <Navbar categories={categories} extraLinks={navbarSettings.extraLinks} />
        <main>{children}</main>
        <Footer categories={categories} settings={footerSettings} pages={pages} />
        <CartDrawer />
        {/* top-center: abajo queda el FAB de WhatsApp (.whatsapp-float) y su
            globo (.wa-teaser); el offset deja lugar al nav sticky de arriba
            (mismo cálculo que usan los asides sticky del catálogo/admin). */}
        <Toaster
          position="top-center"
          theme="light"
          richColors
          closeButton
          offset={{ top: "calc(var(--nav-h) + var(--sp-5))" }}
          mobileOffset={{ top: "calc(var(--nav-h) + var(--sp-4))" }}
        />
        {footerSettings.whatsappNumber && wholesaleSettings.teaserEnabled ? (
          <WhatsAppTeaser text={wholesaleSettings.teaserText} href={wholesaleSettings.teaserHref} />
        ) : null}
        <WhatsAppButton
          phoneNumber={footerSettings.whatsappNumber}
          message={footerSettings.whatsappMessage}
        />
      </WishlistProvider>
    </CartProvider>
  );
}
