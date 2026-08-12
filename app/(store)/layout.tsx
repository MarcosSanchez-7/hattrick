import { getAllCategories, getAllPages, getAllProducts, getSetting } from "@/lib/data";
import { DEFAULT_FOOTER, DEFAULT_NAVBAR } from "@/lib/settings";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartStockToast } from "@/components/cart/CartStockToast";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { WishlistToast } from "@/components/wishlist/WishlistToast";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [categories, products, pages, navbarSettings, footerSettings] =
    await Promise.all([
      getAllCategories(),
      getAllProducts(),
      getAllPages(),
      getSetting("navbar", DEFAULT_NAVBAR),
      getSetting("footer", DEFAULT_FOOTER),
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
    <CartProvider products={products}>
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
        <Navbar
          categories={categories}
          products={products}
          extraLinks={navbarSettings.extraLinks}
        />
        <main>{children}</main>
        <Footer categories={categories} settings={footerSettings} pages={pages} />
        <CartDrawer />
        <CartStockToast />
        <WishlistToast />
        <WhatsAppButton phoneNumber={footerSettings.whatsappNumber} />
      </WishlistProvider>
    </CartProvider>
  );
}
