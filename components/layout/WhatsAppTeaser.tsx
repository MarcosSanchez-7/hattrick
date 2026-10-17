"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconClose } from "@/components/ui/Icons";

const SESSION_KEY = "hattrick-wa-teaser-dismissed";
const SHOW_AFTER_MS = 2500;
const HIDE_AFTER_MS = 10000;

/** Burbuja chica arriba del botón de WhatsApp que promociona una página
 * puntual (ej. /mayorista) -- aparece una vez por sesión de navegación
 * (sessionStorage, no en cada página), se puede cerrar, y se esconde sola
 * después de un rato para no quedar pegada ahí molestando. */
export function WhatsAppTeaser({ text, href }: { text: string; href: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => clearTimeout(hideTimer);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="wa-teaser">
      <Link href={href} className="wa-teaser__link" onClick={dismiss}>
        {text}
      </Link>
      <button
        type="button"
        className="wa-teaser__close"
        aria-label="Cerrar"
        onClick={dismiss}
      >
        <IconClose className="icon--sm" />
      </button>
    </div>
  );
}
