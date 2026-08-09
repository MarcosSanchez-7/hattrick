import Link from "next/link";
import { IconWhatsapp } from "@/components/ui/Icons";

const DEFAULT_MESSAGE = "Hola! Quisiera hacer una consulta.";

/** Vacío = sin botón (no todos los negocios lo quieren activo desde el día uno). */
export function WhatsAppButton({ phoneNumber }: { phoneNumber: string }) {
  if (!phoneNumber) return null;

  return (
    <Link
      href={`https://wa.me/${phoneNumber}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Escribinos por WhatsApp"
      title="Escribinos por WhatsApp"
    >
      <IconWhatsapp />
    </Link>
  );
}
