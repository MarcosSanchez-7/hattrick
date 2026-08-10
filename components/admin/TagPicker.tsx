"use client";

import { useState } from "react";
import type { Tag } from "@/lib/catalog";
import { readableTextColor } from "@/lib/color";

/**
 * Chips de las etiquetas del catálogo (toggle) + un campo para escribir una
 * etiqueta nueva, que se crea en el catálogo al vuelo y queda seleccionada.
 */
export function TagPicker({
  catalog,
  value,
  onChange,
  onCatalogChange,
}: {
  catalog: Tag[];
  value: string[];
  onChange: (tags: string[]) => void;
  onCatalogChange: (catalog: Tag[]) => void;
}) {
  const [newTag, setNewTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (name: string) => {
    onChange(
      value.includes(name) ? value.filter((t) => t !== name) : [...value, name],
    );
  };

  const handleCreate = async () => {
    const name = newTag.trim();
    if (!name) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: "#2f2f2f" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la etiqueta.");
      onCatalogChange([...catalog, data]);
      onChange([...value, data.name]);
      setNewTag("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {error ? <p className="admin-error">{error}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {catalog.map((tag) => {
          const selected = value.includes(tag.name);
          return (
            <button
              key={tag.name}
              type="button"
              className="badge badge--tag"
              onClick={() => toggle(tag.name)}
              style={{
                cursor: "pointer",
                border: selected ? "2px solid var(--ink)" : "2px solid transparent",
                background: tag.color,
                color: readableTextColor(tag.color),
                opacity: selected ? 1 : 0.55,
              }}
            >
              {tag.name}
            </button>
          );
        })}
        {catalog.length === 0 ? (
          <p className="admin-help" style={{ margin: 0 }}>
            Todavía no hay etiquetas estandarizadas — crea una abajo.
          </p>
        ) : null}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Nueva etiqueta (ej. Bajo pedido)"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={creating || !newTag.trim()}
          onClick={handleCreate}
        >
          {creating ? "Creando…" : "Crear y añadir"}
        </button>
      </div>
      <p className="admin-help">
        El color de las etiquetas nuevas se puede ajustar después en
        Generales → Etiquetas.
      </p>
    </div>
  );
}
