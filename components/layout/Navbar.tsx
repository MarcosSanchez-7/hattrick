"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  categoryChildren,
  categorySlugPath,
  topLevelCategories,
  type Category,
  type Product,
} from "@/lib/catalog";
import type { NavLink } from "@/lib/settings";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { SearchOverlay } from "@/components/search/SearchOverlay";
import {
  IconBag,
  IconChevron,
  IconClose,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
} from "@/components/ui/Icons";

export function Navbar({
  categories,
  products,
  extraLinks = [],
  customerName = null,
}: {
  categories: Category[];
  products: Product[];
  extraLinks?: NavLink[];
  customerName?: string | null;
}) {
  const { count, openCart } = useCart();
  const { slugs: wishlistSlugs } = useWishlist();
  // No usa el conteo crudo de localStorage: si un favorito quedó oculto o
  // se borró, seguiría contando acá aunque no aparezca en /favoritos.
  const wishlistCount = products.filter((p) =>
    wishlistSlugs.includes(p.slug),
  ).length;
  const [megaCategory, setMegaCategory] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const prevCount = useRef(count);
  const pathname = usePathname();

  useEffect(() => {
    if (count > prevCount.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 400);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  const topCategories = topLevelCategories(categories);
  const menu = [
    { label: "Novedades", href: "/novedades", slug: null as string | null },
    ...topCategories.map((c) => ({
      label: c.name,
      href: `/categoria/${categorySlugPath(categories, c.slug).join("/")}`,
      slug: c.slug,
    })),
  ];
  const megaChildren = megaCategory ? categoryChildren(categories, megaCategory) : [];

  useEffect(() => {
    setMegaCategory(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.dataset.scrollLocked = "true";
    return () => {
      document.body.dataset.scrollLocked = "false";
    };
  }, [mobileOpen]);

  return (
    <>
      <header className="nav" onMouseLeave={() => setMegaCategory(null)}>
        <div className="container nav__bar">
          <button
            type="button"
            className="nav__icon-btn nav__burger"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <IconMenu />
          </button>

          <Link href="/" className="nav__logo">
            Hattrick<span aria-hidden="true" />
          </Link>

          <nav className="nav__links" aria-label="Navegación principal">
            {menu.map((item) => {
              const hasChildren = item.slug
                ? categoryChildren(categories, item.slug).length > 0
                : false;
              return (
                <div
                  key={item.href}
                  className="nav__item"
                  data-open={hasChildren && megaCategory === item.slug ? "true" : "false"}
                  onMouseEnter={() => setMegaCategory(hasChildren ? item.slug : null)}
                >
                  <Link
                    href={item.href}
                    className="nav__link"
                    data-active={pathname === item.href ? "true" : "false"}
                  >
                    {item.label}
                    {hasChildren ? <IconChevron className="icon--sm" /> : null}
                  </Link>
                </div>
              );
            })}
            {extraLinks.map((link) => (
              <div
                key={link.href}
                className="nav__item"
                onMouseEnter={() => setMegaCategory(null)}
              >
                <Link
                  href={link.href}
                  className="nav__link"
                  data-active={pathname === link.href ? "true" : "false"}
                >
                  {link.label}
                </Link>
              </div>
            ))}
            <div className="nav__item" onMouseEnter={() => setMegaCategory(null)}>
              <Link
                href="/ofertas"
                className="nav__link nav__link--sale"
                data-active={pathname === "/ofertas" ? "true" : "false"}
              >
                Ofertas
              </Link>
            </div>
          </nav>

          <div className="nav__actions">
            <button
              type="button"
              className="nav__icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
            >
              <IconSearch />
            </button>
            <Link
              href="/cuenta"
              className="nav__icon-btn nav__icon-btn--optional"
              aria-label={customerName ? `Hola, ${customerName}` : "Iniciar sesión"}
              title={customerName ? `Hola, ${customerName}` : "Iniciar sesión"}
            >
              <IconUser />
            </Link>
            <Link
              href="/favoritos"
              className="nav__icon-btn nav__icon-btn--optional"
              aria-label={`Favoritos (${wishlistCount} artículos)`}
            >
              <IconHeart />
              {wishlistCount > 0 ? (
                <span className="nav__count">{wishlistCount}</span>
              ) : null}
            </Link>
            <button
              type="button"
              id="site-cart-button"
              className="nav__icon-btn"
              data-bump={cartBump ? "true" : "false"}
              onClick={openCart}
              aria-label={`Carrito (${count} artículos)`}
            >
              <IconBag />
              {count > 0 ? <span className="nav__count">{count}</span> : null}
            </button>
          </div>
        </div>

        {megaCategory && megaChildren.length > 0 ? (
          <div className="megamenu" onMouseLeave={() => setMegaCategory(null)}>
            <div className="container megamenu__inner">
              <div>
                <p className="label megamenu__col-title">Subcategorías</p>
                <ul className="megamenu__list">
                  {megaChildren.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/categoria/${categorySlugPath(categories, c.slug).join("/")}`}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="megamenu__promo">
                <div>
                  <p className="label" style={{ color: "var(--ink-muted)" }}>
                    Destacado
                  </p>
                  <p className="h3" style={{ marginTop: 8 }}>
                    Equipaciones 25/26 ya disponibles
                  </p>
                  <p className="meta" style={{ marginTop: 8 }}>
                    Personalización oficial incluida durante el lanzamiento.
                  </p>
                </div>
                <Link href="/novedades" className="btn btn--sm">
                  Ver la colección
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {searchOpen ? (
        <SearchOverlay products={products} onClose={() => setSearchOpen(false)} />
      ) : null}

      {mobileOpen ? (
        <div className="mobile-menu">
          <div className="mobile-menu__head">
            <span className="nav__logo">
              Hattrick<span aria-hidden="true" />
            </span>
            <button
              type="button"
              className="nav__icon-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <IconClose />
            </button>
          </div>
          <div className="mobile-menu__body">
            <div className="mobile-menu__group">
              <p className="label mobile-menu__title">Tienda</p>
              <Link href="/novedades" className="mobile-menu__link">
                Nuevos ingresos
              </Link>
              <Link
                href="/ofertas"
                className="mobile-menu__link"
                style={{ color: "var(--sale)" }}
              >
                Ofertas
              </Link>
              {topCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/categoria/${categorySlugPath(categories, c.slug).join("/")}`}
                  className="mobile-menu__link"
                >
                  {c.name}
                </Link>
              ))}
              {extraLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mobile-menu__link"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mobile-menu__group">
              <p className="label mobile-menu__title">Cuenta</p>
              <Link href="/cuenta" className="mobile-menu__link">
                {customerName ? `Hola, ${customerName}` : "Iniciar sesión"}
              </Link>
              <Link href="/favoritos" className="mobile-menu__link">
                Favoritos ({wishlistCount})
              </Link>
              <Link href="/carrito" className="mobile-menu__link">
                Carrito ({count})
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
