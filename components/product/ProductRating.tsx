import { IconStar } from "@/components/ui/Icons";

const STAR_COUNT = 5;
const STARS = Array.from({ length: STAR_COUNT });

/** Estrellas de calificación -- product.rating/reviews ya existían en el
 * modelo de datos y eran editables desde el panel, pero nunca se dibujaban
 * en la tienda. Oculto sin reseñas: un "5.0 (0)" en todos los productos por
 * el valor por defecto del admin se leería como inventado. */
export function ProductRating({ rating, reviews }: { rating: number; reviews: number }) {
  if (reviews <= 0) return null;
  const fillPercent = Math.max(0, Math.min(100, (rating / STAR_COUNT) * 100));

  return (
    <div className="rating">
      <span className="rating__stars">
        <span className="rating__stars-track" aria-hidden="true">
          {STARS.map((_, i) => (
            <IconStar key={i} className="icon--sm" />
          ))}
        </span>
        <span
          className="rating__stars-fill"
          style={{ width: `${fillPercent}%` }}
          aria-hidden="true"
        >
          {STARS.map((_, i) => (
            <IconStar key={i} className="icon--sm" />
          ))}
        </span>
      </span>
      <span>{rating.toFixed(1)}</span>
      <span>({reviews})</span>
    </div>
  );
}
