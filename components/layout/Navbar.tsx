"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEAGUES, type Category, type Product } from "@/lib/catalog";
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

const CLUBS_BY_LEAGUE: Record<string, string[]> = {
  LaLiga: ["Real Madrid", "FC Barcelona", "Atlético de Madrid"],
  "Premier League": ["Manchester City", "Liverpool FC", "Arsenal FC"],
  "Serie A": ["Inter de Milán", "AC Milan", "Juventus"],
  "Bundesliga / Ligue 1": ["Bayern de Múnich", "Borussia Dortmund", "PSG"],
};

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
  const { count: wishlistCount } = useWishlist();
  const [megaOpen, setMegaOpen] = useState(false);
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

  const menu: { label: string; href: string; mega: boolean }[] = [
    { label: "Novedades", href: "/novedades", mega: false },
    ...categories.map((c) => ({
      label: c.name,
      href: `/categoria/${c.slug}`,
      mega: c.slug === "clubes",
    })),
  ];

  useEffect(() => {
    setMegaOpen(false);
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
      <header className="nav" onMouseLeave={() => setMegaOpen(false)}>
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
            {menu.map((item) => (
              <div
                key={item.href}
                className="nav__item"
                data-open={item.mega && megaOpen ? "true" : "false"}
                onMouseEnter={() => setMegaOpen(Boolean(item.mega))}
              >
                <Link
                  href={item.href}
                  className="nav__link"
                  data-active={pathname === item.href ? "true" : "false"}
                >
                  {item.label}
                  {item.mega ? <IconChevron className="icon--sm" /> : null}
                </Link>
              </div>
            ))}
            {extraLinks.map((link) => (
              <div
                key={link.href}
                className="nav__item"
                onMouseEnter={() => setMegaOpen(false)}
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
            <div className="nav__item" onMouseEnter={() => setMegaOpen(false)}>
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

        {megaOpen ? (
          <div className="megamenu" onMouseLeave={() => setMegaOpen(false)}>
            <div className="container megamenu__inner">
              <div>
                <p className="label megamenu__col-title">Por liga</p>
                <ul className="megamenu__list">
                  {LEAGUES.map((l) => (
                    <li key={l}>
                      <Link href={`/buscar?q=${encodeURIComponent(l)}`}>{l}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {Object.entries(CLUBS_BY_LEAGUE)
                .slice(0, 2)
                .map(([league, clubs]) => (
                  <div key={league}>
                    <p className="label megamenu__col-title">{league}</p>
                    <ul className="megamenu__list">
                      {clubs.map((c) => (
                        <li key={c}>
                          <Link href={`/buscar?q=${encodeURIComponent(c)}`}>
                            {c}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

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
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/categoria/${c.slug}`}
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
              <p className="label mobile-menu__title">Por liga</p>
              {LEAGUES.map((l) => (
                <Link
                  key={l}
                  href={`/buscar?q=${encodeURIComponent(l)}`}
                  className="mobile-menu__link"
                >
                  {l}
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
