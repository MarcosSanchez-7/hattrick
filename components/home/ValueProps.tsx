"use client";

import { useEffect, useState } from "react";
import type { NoticeIcon } from "@/lib/catalog";
import type { ValuePropsSettings } from "@/lib/settings";
import {
  IconDocument,
  IconPrint,
  IconReturn,
  IconShield,
  IconTruck,
} from "@/components/ui/Icons";

const ICONS: Record<NoticeIcon, typeof IconTruck> = {
  truck: IconTruck,
  print: IconPrint,
  return: IconReturn,
  shield: IconShield,
  info: IconDocument,
};

/** Cada cuánto avanza solo en mobile (ver globals.css) -- en desktop/tablet
 * los 4 siguen mostrándose juntos en fila, sin slider. */
const AUTOPLAY_MS = 5000;

export function ValueProps({ settings }: { settings: ValuePropsSettings }) {
  const items = settings.items;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <section className="container">
      <div className="values" style={{ "--active": index } as React.CSSProperties}>
        {items.map(({ icon, title, text }, i) => {
          const Icon = ICONS[icon];
          return (
            <div
              key={i}
              className="values__item"
              data-active={i === index ? "true" : "false"}
              style={{ "--i": i } as React.CSSProperties}
            >
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 1 ? (
        <div className="values__dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className="values__dot"
              data-active={i === index ? "true" : "false"}
              aria-label={`Ver aviso ${i + 1} de ${items.length}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
