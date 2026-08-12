"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  importProductCostGs,
  importShippingCostGs,
  importSubtotalGs,
  importTaxGs,
  importTotalGs,
} from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { ImportCourier, ImportPurchase } from "@/lib/data";

function toDateInput(iso: string) {
  return iso.slice(0, 10);
}

export function ImportPurchaseForm({
  purchase,
  couriers,
}: {
  purchase?: ImportPurchase;
  couriers: ImportCourier[];
}) {
  const router = useRouter();
  const isEdit = Boolean(purchase);

  const [productName, setProductName] = useState(purchase?.productName ?? "");
  const [costUsd, setCostUsd] = useState(purchase ? String(purchase.costUsd) : "");
  const [exchangeRate, setExchangeRate] = useState(
    purchase ? String(purchase.exchangeRate) : "",
  );
  const [weightKg, setWeightKg] = useState(purchase ? String(purchase.weightKg) : "");
  const [courierId, setCourierId] = useState(purchase?.courierId ?? couriers[0]?.id ?? "");
  const [taxRate, setTaxRate] = useState(purchase ? String(purchase.taxRate) : "10");
  const [purchasedAt, setPurchasedAt] = useState(
    purchase ? toDateInput(purchase.purchasedAt) : toDateInput(new Date().toISOString()),
  );
  const [note, setNote] = useState(purchase?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourier = couriers.find((c) => c.id === courierId);
  const calcInput = {
    costUsd: Number(costUsd) || 0,
    exchangeRate: Number(exchangeRate) || 0,
    weightKg: Number(weightKg) || 0,
    costPerKg: selectedCourier?.costPerKg ?? 0,
    taxRate: Number(taxRate) || 0,
  };
  const canPreview =
    calcInput.costUsd > 0 && calcInput.exchangeRate > 0 && calcInput.weightKg > 0 && selectedCourier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) {
      setError("El producto es obligatorio.");
      return;
    }
    if (!Number.isFinite(calcInput.costUsd) || calcInput.costUsd < 0) {
      setError("El costo en dólares no es válido.");
      return;
    }
    if (!Number.isFinite(calcInput.exchangeRate) || calcInput.exchangeRate <= 0) {
      setError("La cotización del dólar no es válida.");
      return;
    }
    if (!Number.isFinite(calcInput.weightKg) || calcInput.weightKg <= 0) {
      setError("El peso debe ser mayor que 0.");
      return;
    }
    if (!courierId) {
      setError("Selecciona un courier.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit
          ? `/api/admin/finance/import-purchases/${purchase!.id}`
          : "/api/admin/finance/import-purchases",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: productName.trim(),
            costUsd: calcInput.costUsd,
            exchangeRate: calcInput.exchangeRate,
            weightKg: calcInput.weightKg,
            courierId,
            taxRate: calcInput.taxRate,
            purchasedAt: new Date(`${purchasedAt}T12:00:00`).toISOString(),
            note: note.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la importación.");
      router.push("/gestion-ssjblue/finanzas/importaciones");
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

      {couriers.length === 0 ? (
        <p className="admin-notice-warn">
          Todavía no has creado ningún courier — creá uno primero en{" "}
          <Link href="/gestion-ssjblue/finanzas/importaciones/couriers" className="link-underline">
            Couriers
          </Link>
          .
        </p>
      ) : null}

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Compra en China</p>
        <div className="admin-field">
          <label htmlFor="productName">Producto</label>
          <input
            id="productName"
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Ej. Camisetas retro selección Argentina (x40)"
          />
        </div>

        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="costUsd">Costo (US$, pagado por Paypal)</label>
            <input
              id="costUsd"
              type="number"
              min={0}
              step="0.01"
              required
              value={costUsd}
              onChange={(e) => setCostUsd(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="exchangeRate">Cotización del dólar (Gs. por US$, de Paypal)</label>
            <input
              id="exchangeRate"
              type="number"
              min={0}
              step="1"
              required
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="weightKg">Peso del envío (kg)</label>
            <input
              id="weightKg"
              type="number"
              min={0}
              step="0.1"
              required
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="courierId">Courier</label>
            <select
              id="courierId"
              required
              value={courierId}
              onChange={(e) => setCourierId(e.target.value)}
            >
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {formatPrice(c.costPerKg)}/kg
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-form__grid">
          <div className="admin-field">
            <label htmlFor="taxRate">Impuesto (%)</label>
            <input
              id="taxRate"
              type="number"
              min={0}
              step="0.1"
              required
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
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

      <div className="admin-fieldset">
        <p className="admin-fieldset__title">Cálculo automático</p>
        {canPreview ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="meta">Costo del producto</span>
              <span>{formatPrice(importProductCostGs(calcInput))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="meta">
                Flete ({calcInput.weightKg} kg × {formatPrice(calcInput.costPerKg)})
              </span>
              <span>{formatPrice(importShippingCostGs(calcInput))}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--line)",
                paddingTop: 8,
              }}
            >
              <span className="meta">Subtotal</span>
              <span>{formatPrice(importSubtotalGs(calcInput))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="meta">Impuesto ({calcInput.taxRate}%)</span>
              <span>{formatPrice(importTaxGs(calcInput))}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--ink)",
                paddingTop: 8,
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              <span>Total</span>
              <span>{formatPrice(importTotalGs(calcInput))}</span>
            </div>
          </div>
        ) : (
          <p className="admin-help" style={{ marginTop: 0 }}>
            Completá costo, cotización, peso y courier para ver el cálculo.
          </p>
        )}
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => router.push("/gestion-ssjblue/finanzas/importaciones")}
        >
          Cancelar
        </button>
        <button type="submit" className="btn btn--sm" disabled={submitting || couriers.length === 0}>
          {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar importación"}
        </button>
      </div>
    </form>
  );
}
