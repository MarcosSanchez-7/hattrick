"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StockAdjustForm({
  variantId,
  productName,
  size,
  currentStock,
  onClose,
}: {
  variantId: string;
  productName: string;
  size: string;
  currentStock: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"restock" | "correction">("restock");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = (next: "restock" | "correction") => {
    setMode(next);
    setQuantity(next === "correction" ? String(currentStock) : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Ingresá una cantidad válida.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          mode,
          quantity: qty,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo registrar el movimiento.");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="admin-modal-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="admin-modal" role="dialog" aria-modal="true">
        <form className="admin-form" onSubmit={handleSubmit}>
          <p className="admin-fieldset__title">
            Ajustar stock — {productName} · Talla {size}
          </p>
          <p className="admin-help">Stock actual: {currentStock} uds.</p>

          {error ? <p className="admin-error">{error}</p> : null}

          <div className="admin-field">
            <label htmlFor="mode">Tipo de ajuste</label>
            <select
              id="mode"
              value={mode}
              onChange={(e) =>
                handleModeChange(e.target.value as "restock" | "correction")
              }
            >
              <option value="restock">Reposición (suma al stock actual)</option>
              <option value="correction">Corrección (fija el stock exacto)</option>
            </select>
          </div>

          <div className="admin-field">
            <label htmlFor="quantity">
              {mode === "restock" ? "Cantidad a reponer" : "Stock correcto"}
            </label>
            <input
              id="quantity"
              type="number"
              min={0}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="note">Nota (opcional)</label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Llegó pedido de proveedor"
            />
          </div>

          <div className="admin-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--sm" disabled={submitting}>
              {submitting ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
