"use client";

import type { NoticeIcon, ProductNotice } from "@/lib/catalog";
import { IconTrash } from "@/components/ui/Icons";

export const ICON_OPTIONS: { value: NoticeIcon; label: string }[] = [
  { value: "truck", label: "Envío" },
  { value: "print", label: "Personalización" },
  { value: "return", label: "Devolución" },
  { value: "shield", label: "Garantía" },
];

export function NoticesEditor({
  notices,
  onChange,
}: {
  notices: ProductNotice[];
  onChange: (notices: ProductNotice[]) => void;
}) {
  const update = (idx: number, patch: Partial<ProductNotice>) =>
    onChange(notices.map((n, i) => (i === idx ? { ...n, ...patch } : n)));

  const add = () => onChange([...notices, { icon: "truck", text: "" }]);

  const remove = (idx: number) => onChange(notices.filter((_, i) => i !== idx));

  return (
    <div className="stack gap-2">
      {notices.map((n, idx) => (
        <div key={idx} className="row" style={{ gap: 8, alignItems: "center" }}>
          <select
            value={n.icon}
            onChange={(e) => update(idx, { icon: e.target.value as NoticeIcon })}
            style={{ maxWidth: 170, flexShrink: 0 }}
            aria-label="Ícono del aviso"
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={n.text}
            onChange={(e) => update(idx, { text: e.target.value })}
            placeholder="Entrega estimada en 25 a 30 días"
            style={{ flex: 1 }}
            aria-label="Texto del aviso"
          />
          <button
            type="button"
            className="admin-icon-btn admin-icon-btn--danger"
            aria-label="Quitar aviso"
            title="Quitar aviso"
            onClick={() => remove(idx)}
          >
            <IconTrash className="icon--sm" />
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={add}>
          Añadir aviso
        </button>
      </div>
    </div>
  );
}
