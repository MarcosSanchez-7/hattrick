import { getAllCategories, getAllProducts } from "@/lib/data";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [categories, products] = await Promise.all([
    getAllCategories(),
    getAllProducts(),
  ]);

  return (
    <CartProvider products={products}>
      <AnnouncementBar />
      <Navbar categories={categories} products={products} />
      <main>{children}</main>
      <Footer categories={categories} />
      <CartDrawer />
    </CartProvider>
  );
}
