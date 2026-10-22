import Link from "next/link";
import { topLevelCategories, type Category } from "@/lib/catalog";
import { imageVariant } from "@/lib/image";

/** Fila de accesos rápidos solo-mobile (ver .quick-cats en globals.css,
 * oculta por defecto y visible recién <640px) -- CategoryGrid ya cubre el
 * mismo propósito en desktop con tarjetas rectangulares, esto no la
 * reemplaza. Sin estado/hooks (a diferencia de CategoryGrid, que necesita
 * useLoopCarousel para las flechas del carrusel infinito): es solo una
 * fila de links con scroll nativo, así que no hace falta "use client". */
export function QuickCategories({ categories }: { categories: Category[] }) {
  const items = topLevelCategories(categories);
  if (items.length === 0) return null;

  return (
    <nav className="quick-cats" aria-label="Acceso rápido a categorías">
      {items.map((cat) => (
        <Link key={cat.slug} href={`/categoria/${cat.slug}`} className="quick-cats__item">
          <span className="quick-cats__circle">
            {cat.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- círculo de 56px, no una imagen de contenido a optimizar
              <img src={imageVariant(cat.image, "thumb")} alt="" />
            ) : (
              <span aria-hidden="true">{cat.name.charAt(0)}</span>
            )}
          </span>
          <span className="quick-cats__label">{cat.name}</span>
        </Link>
      ))}
    </nav>
  );
}
