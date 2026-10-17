"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconClose } from "@/components/ui/Icons";

const SESSION_KEY = "hattrick-wa-teaser-dismissed";
const SHOW_AFTER_MS = 2500;

/** Burbuja fija arriba del botón de WhatsApp con un único texto -- aparece
 * a los pocos segundos y se queda ahí (no se auto-oculta) hasta que el
 * visitante la cierra con la X. Una vez cerrada, no vuelve a salir en esa
 * misma visita (sessionStorage). */
export function WhatsAppTeaser({ text, href }: { text: string; href: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(showTimer);
  }, []);

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
      <button type="button" className="wa-teaser__close" aria-label="Cerrar" onClick={dismiss}>
        <IconClose className="icon--sm" />
      </button>
    </div>
  );
}
