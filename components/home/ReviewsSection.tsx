import type { ReviewsSettings } from "@/lib/settings";
import { imageVariant } from "@/lib/image";

export function ReviewsSection({ settings }: { settings: ReviewsSettings }) {
  if (settings.items.length === 0) return null;

  return (
    <section className="section section--soft">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="label section-head__eyebrow">Reseñas</span>
            <h2 className="h1">Pedidos ya entregados</h2>
          </div>
        </div>
        <div className="photo-grid">
          {settings.items.map((item) => (
            <div key={item.id} className="photo-grid__item">
              <div className="photo-grid__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageVariant(item.image, "card")}
                  alt={item.caption || "Reseña de cliente HATTRICK"}
                  loading="lazy"
                />
              </div>
              {item.caption ? <p className="meta">{item.caption}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
