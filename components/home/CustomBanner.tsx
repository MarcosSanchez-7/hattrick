"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CustomBannerSettings } from "@/lib/settings";
import { imageVariant } from "@/lib/image";
import { JerseyArt } from "@/components/product/JerseyArt";
import { IconArrow, IconCheck, IconChevron } from "@/components/ui/Icons";

const AUTOPLAY_MS = 5000;

export function CustomBanner({
  settings,
  compact,
}: {
  settings: CustomBannerSettings;
  /** Versión chica para la home: solo la foto + título + "Ver más" hacia
   * /personalizacion, que es donde ya está el resto del contenido completo
   * (ver app/(store)/personalizacion/page.tsx, que renderiza este mismo
   * componente sin compact). */
  compact?: boolean;
}) {
  const images = settings.images;
  const count = images.length;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count]);

  const goTo = (i: number) => setIndex((i + count) % count);

  if (compact) {
    return (
      <section className="section">
        <div className="container">
          <div className="cats__card" style={{ minHeight: 320 }}>
            <Link href={settings.ctaHref} className="cats__hero-link">
              <div className="cats__art">
                {count > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageVariant(images[index], "full")}
                    alt="Personalización HATTRICK"
                    loading="lazy"
                  />
                ) : (
                  <JerseyArt
                    colors={{ primary: "#111111", secondary: "#1f1f1f", accent: "#ffffff" }}
                    pattern="solid"
                    uid="custom-compact"
                    number="7"
                  />
                )}
              </div>
              <div className="cats__overlay" />
              <div className="cats__content">
                <h2 className="h2">PERSONALIZAMOS TU CAMISETA</h2>
                <span className="cats__go">
                  Ver más
                  <IconArrow className="icon--sm" />
                </span>
              </div>
            </Link>
            {count > 1 ? (
              <div className="hero__dots" style={{ bottom: "var(--sp-3)", right: "var(--sp-3)" }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="hero__dot hero__dot--dark"
                    data-active={i === index ? "true" : "false"}
                    onClick={() => setIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="custom">
          <div className="custom__copy">
            <span className="label" style={{ color: "var(--ink-muted)" }}>
              {settings.eyebrow}
            </span>
            <h2 className="h1">{settings.title}</h2>
            <p className="lead">{settings.lead}</p>
            <ul className="custom__list">
              {settings.points.map((p) => (
                <li key={p}>
                  <IconCheck className="icon--sm" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="hero__actions">
              <Link href={settings.ctaHref} className="btn">
                {settings.ctaLabel}
              </Link>
              <span className="meta" style={{ alignSelf: "center" }}>
                {settings.priceLabel}
              </span>
            </div>
          </div>
          <div className="custom__visual">
            {count > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageVariant(images[index], "full")}
                  alt={`Ejemplo de personalización ${index + 1}`}
                  className="custom__visual-img"
                  loading="lazy"
                />
                {count > 1 ? (
                  <>
                    <button
                      type="button"
                      className="pdp__nav pdp__nav--prev"
                      onClick={() => goTo(index - 1)}
                      aria-label="Foto anterior"
                    >
                      <IconChevron className="icon--sm" />
                    </button>
                    <button
                      type="button"
                      className="pdp__nav pdp__nav--next"
                      onClick={() => goTo(index + 1)}
                      aria-label="Foto siguiente"
                    >
                      <IconChevron className="icon--sm" />
                    </button>
                    <div className="hero__dots" style={{ bottom: "var(--sp-3)", right: "var(--sp-3)" }}>
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className="hero__dot hero__dot--dark"
                          data-active={i === index ? "true" : "false"}
                          onClick={() => setIndex(i)}
                          aria-label={`Ver foto ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <JerseyArt
                colors={{
                  primary: "#111111",
                  secondary: "#1f1f1f",
                  accent: "#ffffff",
                }}
                pattern="solid"
                uid="custom"
                number="7"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
