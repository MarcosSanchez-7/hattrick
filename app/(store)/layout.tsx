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

// Mismo revalidate que las paginas hijas (ver app/(store)/page.tsx y
// hermanas) -- un layout con force-dynamic anula el revalidate de sus
// paginas hijas por mas que ellas lo declaren, asi que tiene que coincidir
// acá tambien o el cache nunca se activa de verdad.
export const revalidate = 60;

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
