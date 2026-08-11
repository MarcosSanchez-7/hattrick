"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Page, PagePlacement } from "@/lib/catalog";
import { slugify } from "@/lib/slug";

const PLACEMENTS: { value: PagePlacement; label: string; help: string }[] = [
  {
    value: "legal",
    label: "Legal",
    help: "Franja inferior del footer (junto a Privacidad, Cookies, Términos).",
  },
  {
    value: "ayuda",
    label: "Ayuda",
    help: "Columna \"Ayuda\" del footer.",
  },
  {
    value: "empresa",
    label: "Empresa",
    help: "Columna \"Empresa\" del footer.",
  },
];

export function PageForm({ page }: { page?: Page }) {
  const router = useRouter();
  const isEdit = Boolean(page);

  const [title, setTitle] = useState(page?.title ?? "");
  const [placement, setPlacement] = useState<PagePlacement>(page?.placement ?? "ayuda");
  const [sortOrder, setSortOrder] = useState(String(page?.sortOrder ?? 0));
  const [body, setBody] = useState(page?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = useMemo(() => slugify(title), [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !body.trim()) {
      setError("Completa el título y el contenido.");
      return;
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      placement,
      sortOrder: Number(sortOrder) || 0,
    };

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/pages/${page!.slug}` : "/api/admin/pages",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar la página.");
      }
      router.push("/gestion-ssjblue/paginas");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Datos de la página</p>
        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="title">Título</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Envíos y plazos"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="placement">Dónde aparece</label>
            <select
              id="placement"
              value={placement}
              onChange={(e) => setPlacement(e.target.value as PagePlacement)}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="admin-help">
          {PLACEMENTS.find((p) => p.value === placement)?.help}
        </p>
        <div className="admin-field">
          <label>URL</label>
          <p className="admin-help">
            /pagina/{isEdit ? page!.slug : suggestedSlug || "…"}
            {isEdit ? " — no se puede cambiar una vez creada." : ""}
          </p>
        </div>
        <div className="admin-field">
          <label htmlFor="sortOrder">Orden (menor primero)</label>
          <input
            id="sortOrder"
            type="number"
            step="1"
            style={{ maxWidth: 120 }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Contenido</p>
        <div className="admin-field">
          <label htmlFor="body">Texto</label>
          <textarea
            id="body"
            required
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dejá una línea vacía entre párrafos."
          />
          <p className="admin-help">
            Dejá una línea vacía entre párrafos para separarlos en la
            página.
          </p>
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/paginas")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting
            ? "Guardando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear página"}
        </button>
      </div>
    </form>
  );
}
