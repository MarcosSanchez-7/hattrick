"use client";

import type { ProductAttribute } from "@/lib/settings";
import { IconTrash } from "@/components/ui/Icons";

export function ProductAttributesEditor({
  attributes,
  onChange,
}: {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
}) {
  const update = (idx: number, patch: Partial<ProductAttribute>) =>
    onChange(attributes.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  const add = () => onChange([...attributes, { label: "", value: "" }]);

  const remove = (idx: number) => onChange(attributes.filter((_, i) => i !== idx));

  return (
    <div className="stack gap-2">
      {attributes.map((a, idx) => (
        <div key={idx} className="row" style={{ gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={a.label}
            onChange={(e) => update(idx, { label: e.target.value })}
            placeholder="Material"
            style={{ maxWidth: 170, flexShrink: 0 }}
            aria-label="Nombre del atributo"
          />
          <input
            type="text"
            value={a.value}
            onChange={(e) => update(idx, { value: e.target.value })}
            placeholder="100 % poliéster reciclado"
            style={{ flex: 1 }}
            aria-label="Valor del atributo"
          />
          <button
            type="button"
            className="admin-icon-btn admin-icon-btn--danger"
            aria-label="Quitar atributo"
            title="Quitar atributo"
            onClick={() => remove(idx)}
          >
            <IconTrash className="icon--sm" />
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={add}>
          Añadir atributo
        </button>
      </div>
    </div>
  );
}
