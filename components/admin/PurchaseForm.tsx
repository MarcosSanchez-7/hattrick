"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MerchandisePurchase } from "@/lib/data";

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function PurchaseForm({ purchase }: { purchase?: MerchandisePurchase }) {
  const router = useRouter();
  const isEdit = Boolean(purchase);

  const [productName, setProductName] = useState(purchase?.productName ?? "");
  const [quantity, setQuantity] = useState(purchase ? String(purchase.quantity) : "");
  const [unitCost, setUnitCost] = useState(purchase ? String(purchase.unitCost) : "");
  const [supplier, setSupplier] = useState(purchase?.supplier ?? "");
  const [purchasedAt, setPurchasedAt] = useState(
    purchase ? toDateInput(purchase.purchasedAt) : toDateInput(new Date().toISOString()),
  );
  const [note, setNote] = useState(purchase?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quantityNum = Number(quantity);
  const unitCostNum = Number(unitCost);
  const total =
    Number.isFinite(quantityNum) && Number.isFinite(unitCostNum)
      ? quantityNum * unitCostNum
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) {
      setError("El producto es obligatorio.");
      return;
    }
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setError("La cantidad debe ser mayor que 0.");
      return;
    }
    if (!Number.isFinite(unitCostNum) || unitCostNum < 0) {
      setError("El precio de compra no es válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/finance/purchases/${purchase!.id}`
          : "/api/admin/finance/purchases",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: productName.trim(),
            quantity: quantityNum,
            unitCost: unitCostNum,
            supplier: supplier.trim() || undefined,
            purchasedAt: new Date(`${purchasedAt}T12:00:00`).toISOString(),
            note: note.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la compra.");
      router.push("/gestion-ssjblue/finanzas/compras");
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
        <p className="admin-fieldset__title">Datos de la compra</p>
        <div className="admin-field">
          <label htmlFor="productName">Producto</label>
          <input
            id="productName"
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ej. Camiseta Boca Jrs. Alternativa 2026"
          />
        </div>

        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="quantity">Cantidad</label>
            <input
              id="quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="unitCost">Precio de compra (Gs., por unidad)</label>
            <input
              id="unitCost"
              type="number"
              min={0}
              step={1}
              required
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </div>
        </div>

        <p className="admin-help">Total de la compra: {total.toLocaleString("es-PY")} Gs.</p>

        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="supplier">Proveedor (opcional)</label>
            <input
              id="supplier"
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="purchasedAt">Fecha</label>
            <input
              id="purchasedAt"
              type="date"
              required
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-field">
          <label htmlFor="note">Nota (opcional)</label>
          <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/finanzas/compras")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar compra"}
        </button>
      </div>
    </form>
  );
}
