"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NavbarSettings } from "@/lib/settings";
import { IconClose, IconPlus } from "@/components/ui/Icons";

export function NavbarSettingsForm({ initial }: { initial: NavbarSettings }) {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState(initial.announcements);
  const [extraLinks, setExtraLinks] = useState(initial.extraLinks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateAnnouncement = (idx: number, value: string) => {
    setSaved(false);
    setAnnouncements((prev) => prev.map((a, i) => (i === idx ? value : a)));
  };
  const removeAnnouncement = (idx: number) => {
    setSaved(false);
    setAnnouncements((prev) => prev.filter((_, i) => i !== idx));
  };
  const addAnnouncement = () => {
    setSaved(false);
    setAnnouncements((prev) => [...prev, ""]);
  };

  const updateLink = (idx: number, key: "label" | "href", value: string) => {
    setSaved(false);
    setExtraLinks((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)),
    );
  };
  const removeLink = (idx: number) => {
    setSaved(false);
    setExtraLinks((prev) => prev.filter((_, i) => i !== idx));
  };
  const addLink = () => {
    setSaved(false);
    setExtraLinks((prev) => [...prev, { label: "", href: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: NavbarSettings = {
        announcements: announcements.map((a) => a.trim()).filter(Boolean),
        extraLinks: extraLinks
          .map((l) => ({ label: l.label.trim(), href: l.href.trim() }))
          .filter((l) => l.label && l.href),
      };
      const res = await fetch("/api/admin/settings/navbar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        <p className="admin-fieldset__title">Barra de avisos superior</p>
        <p className="admin-help">
          Los mensajes rotan separados por un guion en la parte de arriba de la web.
        </p>
        <div className="stack gap-2">
          {announcements.map((a, idx) => (
            <div key={idx} className="row gap-2">
              <input
                type="text"
                value={a}
                onChange={(e) => updateAnnouncement(idx, e.target.value)}
                style={{
                  flex: 1,
                  border: "1px solid var(--line)",
                  padding: "9px 12px",
                  fontSize: "0.9375rem",
                }}
              />
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Quitar mensaje"
                onClick={() => removeAnnouncement(idx)}
              >
                <IconClose className="icon--sm" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={addAnnouncement}
          style={{ alignSelf: "flex-start" }}
        >
          <IconPlus className="icon--sm" />
          Añadir mensaje
        </button>
      </div>

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Enlaces adicionales del menú</p>
        <p className="admin-help">
          Se muestran después de las categorías, antes de "Ofertas".
        </p>
        <div className="stack gap-2">
          {extraLinks.map((link, idx) => (
            <div key={idx} className="row gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(idx, "label", e.target.value)}
                placeholder="Texto del enlace"
                style={{
                  flex: 1,
                  border: "1px solid var(--line)",
                  padding: "9px 12px",
                  fontSize: "0.9375rem",
                }}
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => updateLink(idx, "href", e.target.value)}
                placeholder="/ruta o https://…"
                style={{
                  flex: 1,
                  border: "1px solid var(--line)",
                  padding: "9px 12px",
                  fontSize: "0.9375rem",
                }}
              />
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Quitar enlace"
                onClick={() => removeLink(idx)}
              >
                <IconClose className="icon--sm" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={addLink}
          style={{ alignSelf: "flex-start" }}
        >
          <IconPlus className="icon--sm" />
          Añadir enlace
        </button>
      </div>

      <div className="admin-actions">
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
