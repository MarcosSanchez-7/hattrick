"use client";

import Link from "next/link";
import { IconWhatsapp } from "@/components/ui/Icons";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";

/** Vacío = sin botón (no todos los negocios lo quieren activo desde el día uno). */
export function WhatsAppButton({
  phoneNumber,
  message,
}: {
  phoneNumber: string;
  message: string;
}) {
  if (!phoneNumber) return null;

  return (
    <Link
      href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Escribinos por WhatsApp"
      title="Escribinos por WhatsApp"
      onClick={() => trackPixelEvent("Contact")}
    >
      <IconWhatsapp />
    </Link>
  );
}
