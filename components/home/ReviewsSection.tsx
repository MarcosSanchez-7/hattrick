"use client";

import { useState } from "react";
import type { ReviewsSettings } from "@/lib/settings";
import { imageVariant } from "@/lib/image";

// Los ítems se cargan al final del array (ver ReviewsSettingsForm.tsx:
// [...f.items, emptyItem()]) -- las últimas 4 son las últimas subidas.
const INITIAL_COUNT = 4;

export function ReviewsSection({ settings }: { settings: ReviewsSettings }) {
  const [expanded, setExpanded] = useState(false);

  if (settings.items.length === 0) return null;

  const hasMore = settings.items.length > INITIAL_COUNT;
  const visibleItems = expanded ? settings.items : settings.items.slice(-INITIAL_COUNT);

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
          {visibleItems.map((item) => (
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
        {hasMore && !expanded ? (
          <div style={{ textAlign: "center", marginTop: "var(--sp-5)" }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setExpanded(true)}
            >
              Ver más pedidos
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
