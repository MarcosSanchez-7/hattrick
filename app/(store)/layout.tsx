import { getAllCategories, getAllProducts, getSetting } from "@/lib/data";
import { DEFAULT_FOOTER, DEFAULT_NAVBAR } from "@/lib/settings";
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
  const [categories, products, navbarSettings, footerSettings] =
    await Promise.all([
      getAllCategories(),
      getAllProducts(),
      getSetting("navbar", DEFAULT_NAVBAR),
      getSetting("footer", DEFAULT_FOOTER),
    ]);

  return (
    <CartProvider products={products}>
      <WishlistProvider>
        <AnnouncementBar items={navbarSettings.announcements} />
        <Navbar
          categories={categories}
          products={products}
          extraLinks={navbarSettings.extraLinks}
        />
        <main>{children}</main>
        <Footer categories={categories} settings={footerSettings} />
        <CartDrawer />
        <CartStockToast />
        <WishlistToast />
        <WhatsAppButton phoneNumber={footerSettings.whatsappNumber} />
      </WishlistProvider>
    </CartProvider>
  );
}
