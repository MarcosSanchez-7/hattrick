"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { orderCategoriesTree, type Category } from "@/lib/catalog";
import type { HomeSettings } from "@/lib/settings";

export function HomeSettingsForm({
  initial,
  categories,
}: {
  initial: HomeSettings;
  categories: Category[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<HomeSettings>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/home", {
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

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Secciones de la home</p>
        <div className="admin-field admin-field--checkbox">
          <input
            id="showNewArrivals"
            type="checkbox"
            checked={form.showNewArrivals}
            onChange={(e) =>
              setForm((f) => {
                setSaved(false);
                return { ...f, showNewArrivals: e.target.checked };
              })
            }
          />
          <label htmlFor="showNewArrivals" style={{ marginBottom: 0 }}>
            Mostrar &quot;Nuevos ingresos&quot;
          </label>
        </div>
        <p className="admin-help">
          Activala solo cuando cargues bastante mercadería nueva de una — si
          hay poca, mejor mantenerla apagada.
        </p>

        <div className="admin-field admin-field--checkbox" style={{ marginTop: 16 }}>
          <input
            id="showBestSellers"
            type="checkbox"
            checked={form.showBestSellers}
            onChange={(e) =>
              setForm((f) => {
                setSaved(false);
                return { ...f, showBestSellers: e.target.checked };
              })
            }
          />
          <label htmlFor="showBestSellers" style={{ marginBottom: 0 }}>
            Mostrar &quot;Más vendidos&quot;
          </label>
        </div>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Combos</p>
        <p className="admin-help" style={{ marginTop: 0 }}>
          Franja de productos de una categoría puntual (ej. "Combos"), en el
          mismo lugar de la home que "Más vendidos" — podés tener las dos
          apagadas, las dos prendidas, o alternar entre ellas.
        </p>
        <div className="admin-field admin-field--checkbox">
          <input
            id="combosEnabled"
            type="checkbox"
            checked={form.combos.enabled}
            onChange={(e) =>
              setForm((f) => {
                setSaved(false);
                return { ...f, combos: { ...f.combos, enabled: e.target.checked } };
              })
            }
          />
          <label htmlFor="combosEnabled" style={{ marginBottom: 0 }}>
            Mostrar &quot;Combos&quot;
          </label>
        </div>
        <div className="admin-field" style={{ marginTop: 12 }}>
          <label htmlFor="combosCategory">Categoría a mostrar</label>
          <select
            id="combosCategory"
            value={form.combos.categorySlug}
            onChange={(e) =>
              setForm((f) => {
                setSaved(false);
                return { ...f, combos: { ...f.combos, categorySlug: e.target.value } };
              })
            }
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
            Se muestran los productos de esa categoría (y de sus
            subcategorías, si tiene).
          </p>
        </div>
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
