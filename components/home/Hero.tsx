"use client";

import { useState } from "react";
import Link from "next/link";
import type { HeroSettings } from "@/lib/settings";
import { IconChevron } from "@/components/ui/Icons";

export function Hero({ settings }: { settings: HeroSettings }) {
  const [index, setIndex] = useState(0);
  const slides = settings.slides.length > 0 ? settings.slides : [];
  const count = slides.length;
  const slide = slides[index];

  const goTo = (i: number) => setIndex((i + count) % count);

  return (
    <section className="hero">
      <div
        className="hero__slide"
        style={slide?.image ? { backgroundImage: `url(${slide.image})` } : undefined}
      >
        <div className="hero__overlay" />

        {slide ? (
          <div className="container">
            <div className="hero__slide-content">
              <span className="label hero__eyebrow">{slide.eyebrow}</span>
              <h1 className="display">{slide.headline}</h1>
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
  );
}
