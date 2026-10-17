"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconClose } from "@/components/ui/Icons";

const INTERVAL_MS = 30000;
const VISIBLE_MS = 6000;
const FIRST_SHOW_DELAY_MS = 4000;

/** Burbuja chica arriba del botón de WhatsApp que va rotando frases cortas
 * ("Precios mayoristas", "Super precio por docena", ...) cada 30s mientras
 * el visitante sigue en la tienda -- no es un aviso único: la idea es
 * tentar con un empujoncito recurrente, no una sola vez. Se puede cerrar
 * (oculta esa aparición puntual), pero vuelve a salir en el próximo ciclo. */
export function WhatsAppTeaser({ messages, href }: { messages: string[]; href: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (messages.length === 0) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    const show = () => {
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
    };
    const firstTimer = setTimeout(show, FIRST_SHOW_DELAY_MS);
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
      show();
    }, INTERVAL_MS);
    return () => {
      clearTimeout(firstTimer);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [messages.length]);

  const dismiss = () => setVisible(false);

  if (messages.length === 0 || !visible) return null;

  return (
    <div className="wa-teaser">
      <Link href={href} className="wa-teaser__link" onClick={dismiss}>
        {messages[index]}
      </Link>
      <button type="button" className="wa-teaser__close" aria-label="Cerrar" onClick={dismiss}>
        <IconClose className="icon--sm" />
      </button>
    </div>
  );
}
