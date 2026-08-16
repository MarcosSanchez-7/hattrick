"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QrCampaign } from "@/lib/data";
import { SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { formatRelativeTime } from "@/lib/format";
import { IconTrash } from "@/components/ui/Icons";

export function QrCampaignsManager({ initial }: { initial: QrCampaign[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedSlug = slugify(name);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const finalSlug = (slugTouched ? slug : suggestedSlug).trim();
    if (!name.trim() || !finalSlug) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/qr-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: finalSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el código QR.");
      setCampaigns((prev) => [...prev, data]);
      setName("");
      setSlug("");
      setSlugTouched(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (campaign: QrCampaign) => {
    if (
      !window.confirm(
        `¿Eliminar «${campaign.name}»? Si ya imprimiste ese QR, dejará de sumar escaneos.`,
      )
    ) {
      return;
    }
    setPendingSlug(campaign.slug);
    try {
      const res = await fetch(`/api/admin/qr-campaigns/${campaign.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo eliminar el código QR.");
      }
      setCampaigns((prev) => prev.filter((c) => c.slug !== campaign.slug));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setPendingSlug(null);
    }
  };

  const handleCopy = async (campaign: QrCampaign) => {
    const url = `${SITE_URL}/qr/${campaign.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(campaign.slug);
      setTimeout(() => setCopiedSlug((s) => (s === campaign.slug ? null : s)), 1500);
    } catch {
      window.prompt("Copiá el link:", url);
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
          className="row gap-2"
          style={{ alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <div className="admin-field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <label htmlFor="qrName">Nombre</label>
            <input
              id="qrName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Bolsas de envío, Flyer local"
            />
          </div>
          <div className="admin-field" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
            <label htmlFor="qrSlug">Identificador (va en el link)</label>
            <input
              id="qrSlug"
              type="text"
              value={slugTouched ? slug : suggestedSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="se-genera-solo"
            />
          </div>
          <button
            type="submit"
            className="btn btn--sm"
            disabled={creating || !name.trim() || !(slugTouched ? slug : suggestedSlug)}
          >
            {creating ? "Creando…" : "Crear código QR"}
          </button>
        </form>
        <p className="admin-help">
          El link queda en {SITE_URL}/qr/
          {slugTouched ? slug : suggestedSlug || "…"} — es lo que hay que
          codificar en la imagen del QR.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="admin-empty">Todavía no creaste ningún código QR.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Link</th>
                <th>Escaneos</th>
                <th>Último escaneo</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.slug}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td data-label="Link" className="meta">
                    /qr/{c.slug}
                  </td>
                  <td data-label="Escaneos" style={{ fontWeight: 600 }}>
                    {c.scanCount}
                  </td>
                  <td data-label="Último escaneo" className="meta">
                    {c.lastScannedAt ? formatRelativeTime(c.lastScannedAt) : "Todavía ninguno"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ height: 32, paddingInline: 12 }}
                        onClick={() => handleCopy(c)}
                      >
                        {copiedSlug === c.slug ? "Copiado" : "Copiar link"}
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn admin-icon-btn--danger"
                        aria-label={`Eliminar ${c.name}`}
                        title="Eliminar"
                        disabled={pendingSlug === c.slug}
                        onClick={() => handleDelete(c)}
                      >
                        <IconTrash className="icon--sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
