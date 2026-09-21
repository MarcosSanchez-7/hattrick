"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrow } from "@/components/ui/Icons";

type AdminBackLinkProps = {
  /** Fallback si no hay historial propio del panel (ej. se entró por link
   * directo) -- también queda como href real para abrir en pestaña nueva /
   * clic derecho "copiar enlace". */
  href: string;
  label: string;
};

/**
 * Antes era un <Link> a una ruta fija: "volver" desde la edición de un
 * producto siempre mandaba a la raíz de Inventario, perdiendo cualquier
 * búsqueda/filtro que hubiera activo. router.back() vuelve al estado real
 * de la página anterior (con su búsqueda, scroll, etc.), como un botón
 * "atrás" de verdad.
 */
export function AdminBackLink({ href, label }: AdminBackLinkProps) {
  const router = useRouter();

  return (
    <Link
      className="admin-back-link"
      href={href}
      onClick={(e) => {
        e.preventDefault();
        router.back();
      }}
    >
      <IconArrow className="icon--sm admin-back-link__icon" />
      <span>{label}</span>
    </Link>
  );
}
