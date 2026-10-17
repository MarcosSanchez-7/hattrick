"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Carrusel .hscroll en loop infinito: en vez de un truco con clones+JS en
 * cada render, el llamador repite su lista de items x3 (ver CategoryGrid.tsx
 * / DtfSection.tsx, [...items, ...items, ...items] con key por copia) y este
 * hook solo arranca centrado en la copia del medio y, cuando el scroll nativo
 * entra en la copia de al lado, lo reposiciona sin animación un "segmento"
 * atrás/adelante -- el usuario nunca ve el salto, solo que nunca se acaba.
 */
export function useLoopCarousel<T>(items: T[]) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;
    track.scrollLeft = track.scrollWidth / 3;
  }, [items.length]);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const segment = track.scrollWidth / 3;
    if (segment === 0) return;
    if (track.scrollLeft < segment * 0.5) {
      track.scrollLeft += segment;
    } else if (track.scrollLeft > segment * 1.5) {
      track.scrollLeft -= segment;
    }
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return { trackRef, handleScroll, scrollBy };
}
