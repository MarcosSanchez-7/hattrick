"use client";

import { useState, type ReactNode } from "react";
import { IconChevron } from "@/components/ui/Icons";

/**
 * Mismo .admin-fieldset de siempre, pero con el título como botón que
 * despliega/colapsa el contenido -- para secciones largas que no hace
 * falta ver siempre (ej. "Detalles de la venta", "Entrega", "Proveedores").
 * defaultOpen se decide por sección: abierto si ya hay datos cargados
 * (edición), cerrado si es un alta nueva (flujo rápido de carga).
 */
export function CollapsibleFieldset({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="admin-fieldset">
      <button
        type="button"
        className="admin-fieldset__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>
          <span className="admin-fieldset__title" style={{ marginBottom: 0 }}>
            {title}
          </span>
          {!open && subtitle ? <span className="meta">{subtitle}</span> : null}
        </span>
        <IconChevron className="icon--sm admin-fieldset__chevron" />
      </button>
      {open ? children : null}
    </div>
  );
}
