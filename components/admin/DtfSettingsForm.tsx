"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { orderCategoriesTree, type Category } from "@/lib/catalog";
import type { DtfSettings } from "@/lib/settings";
import { ImageUploader } from "@/components/admin/ImageUploader";

export function DtfSettingsForm({
  initial,
  categories,
}: {
  initial: DtfSettings;
  categories: Category[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<DtfSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof DtfSettings>(key: K, value: DtfSettings[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/dtf", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setSaved(true);
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
      {saved ? <p className="admin-notice-ok">Cambios guardados.</p> : null}

      <p className="admin-help">
        Vidriera destacada de la home, con fondo oscuro, justo después de
        &quot;Ofertas de la semana&quot;. Los productos salen de una
        categoría del catálogo — se cargan desde Productos como cualquier
        otro artículo (fotos, precio, talles), no desde acá.
      </p>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Productos</p>
        <div className="admin-field">
          <label htmlFor="dtfCategory">Categoría a mostrar</label>
          <select
            id="dtfCategory"
            value={form.categorySlug}
            onChange={(e) => update("categorySlug", e.target.value)}
          >
            <option value="">— Elegí una categoría —</option>
            {orderCategoriesTree(categories).map(({ category: c, depth }) => (
              <option key={c.slug} value={c.slug}>
                {"— ".repeat(depth)}
                {c.name}
              </option>
            ))}
          </select>
          <p className="admin-help">
            Se muestran los productos de esa categoría (y sus subcategorías).
            Cada uno aparece con la etiqueta &quot;BAJO PEDIDO&quot; puesta
            automáticamente — no hace falta taggearlos a mano. Para que se
            vea completo (y para que funcione el efecto de ver la segunda
            foto al pasar el mouse), cargá al menos 3 fotos por producto.
            Vacío = la sección no se muestra.
          </p>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Texto</p>
        <div className="admin-field">
          <label htmlFor="eyebrow">Texto pequeño superior</label>
          <input
            id="eyebrow"
            type="text"
            value={form.eyebrow}
            onChange={(e) => update("eyebrow", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="title">Título</label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="lead">Descripción</label>
          <textarea id="lead" value={form.lead} onChange={(e) => update("lead", e.target.value)} />
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Botón (opcional)</p>
        <div className="admin-form__grid admin-form__grid--3">
          <div className="admin-field">
            <label htmlFor="ctaLabel">Texto del botón</label>
            <input
              id="ctaLabel"
              type="text"
              value={form.ctaLabel}
              onChange={(e) => update("ctaLabel", e.target.value)}
              placeholder="Pedí tu estampado"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="ctaHref">Enlace del botón</label>
            <input
              id="ctaHref"
              type="text"
              value={form.ctaHref}
              onChange={(e) => update("ctaHref", e.target.value)}
              placeholder="https://wa.me/595... o /personalizacion"
            />
          </div>
        </div>
        <p className="admin-help">Vacío en texto del botón = no se muestra ningún botón.</p>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Fondo de la sección</p>
        <p className="admin-help" style={{ marginTop: 0 }}>
          Imagen de alta calidad (PNG recomendado) para jugar con la
          temática de la página. Vacío = fondo sólido oscuro, igual que
          &quot;Ofertas de la semana&quot;.
        </p>
        <ImageUploader
          images={form.backgroundImage ? [form.backgroundImage] : []}
          onChange={(images) => update("backgroundImage", images[0] ?? "")}
          max={1}
          folder="dtf"
        />
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
