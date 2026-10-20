"use client";

import { Fragment, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { HeroSettings } from "@/lib/settings";
import { IconChevron } from "@/components/ui/Icons";

/** Convierte el titular en nodos de React: "\n" fuerza un salto de línea y
 * "{{texto}}" resalta ese fragmento en dorado (.hero__accent). Se procesa
 * acá en vez de guardar HTML en la base -- el campo sigue siendo texto
 * plano editable a mano desde el panel, sin abrir la puerta a inyectar
 * markup arbitrario. */
function parseHeroHeadline(raw: string) {
  const lines = raw.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\{\{.*?\}\})/g).filter(Boolean);
    return (
      <Fragment key={i}>
        {i > 0 ? <br /> : null}
        {parts.map((part, j) => {
          const match = /^\{\{(.*)\}\}$/.exec(part);
          return match ? (
            <span key={j} className="hero__accent">
              {match[1]}
            </span>
          ) : (
            <Fragment key={j}>{part}</Fragment>
          );
        })}
      </Fragment>
    );
  });
}

export function Hero({ settings }: { settings: HeroSettings }) {
  const [index, setIndex] = useState(0);
  const slides = settings.slides.length > 0 ? settings.slides : [];
  const count = slides.length;
  const slide = slides[index];

  const goTo = (i: number) => setIndex((i + count) % count);

  const bgVars = slide
    ? ({
        "--hero-bg-desktop": slide.image ? `url(${slide.image})` : "none",
        "--hero-bg-mobile": slide.mobileImage
          ? `url(${slide.mobileImage})`
          : slide.image
            ? `url(${slide.image})`
            : "none",
      } as CSSProperties)
    : undefined;

  return (
    <div className="hero-pin">
      <section className="hero">
        <div
          key={slide?.id}
          className="hero__slide"
          data-nav={count > 1 ? "true" : "false"}
          style={bgVars}
        >
          <div className="hero__overlay" />

          {slide ? (
            <div className="container">
              <div className="hero__slide-content">
                <span className="label hero__eyebrow">{slide.eyebrow}</span>
                <h1 className="display">{parseHeroHeadline(slide.headline)}</h1>
                {slide.description ? (
                  <p className="hero__description">{slide.description}</p>
                ) : null}
                {slide.ctaLabel ? (
                  <div className="hero__actions">
                    <Link href={slide.ctaHref || "/"} className="btn btn--light">
                      {slide.ctaLabel}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {count > 1 ? (
            <>
              <button
                type="button"
                className="hero__nav hero__nav--prev"
                onClick={() => goTo(index - 1)}
                aria-label="Flyer anterior"
              >
                <IconChevron className="icon--sm" />
              </button>
              <button
                type="button"
                className="hero__nav hero__nav--next"
                onClick={() => goTo(index + 1)}
                aria-label="Flyer siguiente"
              >
                <IconChevron className="icon--sm" />
              </button>
              <div className="hero__dots">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className="hero__dot"
                    data-active={i === index ? "true" : "false"}
                    onClick={() => setIndex(i)}
                    aria-label={`Ver flyer ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {settings.stats.length > 0 ? (
          <div className="container">
            <div className="hero__stats-strip">
              {settings.stats.map((stat, i) => (
                <div key={i}>
                  <div className="hero__stat-value">{stat.value}</div>
                  <div className="meta">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
