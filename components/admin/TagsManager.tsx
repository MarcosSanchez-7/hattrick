"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tag } from "@/lib/catalog";
import { readableTextColor } from "@/lib/color";
import { IconTrash } from "@/components/ui/Icons";

export function TagsManager({ initial }: { initial: Tag[] }) {
  const router = useRouter();
  const [tags, setTags] = useState(initial);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2f2f2f");
  const [isFilter, setIsFilter] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, isFilter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la etiqueta.");
      setTags((prev) => [...prev, data]);
      setName("");
      setColor("#2f2f2f");
      setIsFilter(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  const handleColorChange = async (tag: Tag, newColor: string) => {
    setTags((prev) => prev.map((t) => (t.name === tag.name ? { ...t, color: newColor } : t)));
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: newColor }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("No se pudo actualizar el color.");
    }
  };

  const handleFilterToggle = async (tag: Tag) => {
    const nextIsFilter = !tag.isFilter;
    setTags((prev) =>
      prev.map((t) => (t.name === tag.name ? { ...t, isFilter: nextIsFilter } : t)),
    );
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFilter: nextIsFilter }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setTags((prev) =>
        prev.map((t) => (t.name === tag.name ? { ...t, isFilter: tag.isFilter } : t)),
      );
      setError("No se pudo actualizar la etiqueta.");
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`¿Eliminar la etiqueta «${tag.name}»?`)) return;
    setPendingName(tag.name);
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag.name)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar la etiqueta.");
      }
      setTags((prev) => prev.filter((t) => t.name !== tag.name));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingName(null);
    }
  };

  return (
    <div className="admin-card">
      {error ? (
        <p className="admin-error" style={{ margin: "16px 16px 0" }}>
          {error}
        </p>
      ) : null}

      <div style={{ padding: 16 }}>
        <form
          onSubmit={handleCreate}
          className="row"
          style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la nueva etiqueta (ej. Versión Fan)"
            style={{ flex: 1, minWidth: 220 }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Color de la etiqueta"
            style={{ width: 44, height: 38, padding: 2 }}
          />
          <label className="row" style={{ gap: 6, alignItems: "center", fontSize: "0.8125rem" }}>
            <input
              type="checkbox"
              checked={isFilter}
              onChange={(e) => setIsFilter(e.target.checked)}
            />
            Usar como filtro
          </label>
          <button type="submit" className="btn btn--sm" disabled={creating || !name.trim()}>
            {creating ? "Creando…" : "Añadir etiqueta"}
          </button>
        </form>
        <p className="admin-help" style={{ marginTop: 8 }}>
          "Usar como filtro" (ej. Premier League, La Liga) agrega un chip para
          filtrar en categoría/novedades/ofertas/búsqueda, y NO se muestra
          como badge en la tarjeta de producto. Sin marcar, es una etiqueta
          descriptiva normal (ej. Versión Fan) — solo badge, sin filtro.
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="admin-empty">Todavía no has creado ninguna etiqueta.</div>
      ) : (
        <div style={{ padding: "0 16px 16px", display: "flex", flexWrap: "wrap", gap: 10 }}>
          {tags.map((tag) => (
            <div
              key={tag.name}
              className="row"
              style={{
                gap: 8,
                alignItems: "center",
                border: "1px solid var(--line)",
                borderRadius: 999,
                paddingLeft: 4,
                paddingRight: 6,
                height: 40,
              }}
            >
              <input
                type="color"
                value={tag.color}
                onChange={(e) => handleColorChange(tag, e.target.value)}
                aria-label={`Color de ${tag.name}`}
                style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: "50%" }}
              />
              <span
                className="badge badge--tag"
                style={{ background: tag.color, color: readableTextColor(tag.color) }}
              >
                {tag.name}
              </span>
              <button
                type="button"
                className="link-underline meta"
                onClick={() => handleFilterToggle(tag)}
                title="Si está marcada, genera un chip de filtro en vez de (o además de) badge"
              >
                {tag.isFilter ? "Filtro ✓" : "Usar como filtro"}
              </button>
              <button
                type="button"
                className="admin-icon-btn admin-icon-btn--danger"
                aria-label={`Eliminar ${tag.name}`}
                title="Eliminar"
                disabled={pendingName === tag.name}
                onClick={() => handleDelete(tag)}
                style={{ width: 28, height: 28 }}
              >
                <IconTrash className="icon--sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
