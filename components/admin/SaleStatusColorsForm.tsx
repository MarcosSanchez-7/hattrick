"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DELIVERY_STATUSES,
  PAYMENT_STATUSES,
  type DeliveryStatus,
  type PaymentStatus,
} from "@/lib/catalog";
import { readableTextColor } from "@/lib/color";
import type { SaleStatusColors } from "@/lib/settings";

export function SaleStatusColorsForm({ initial }: { initial: SaleStatusColors }) {
  const router = useRouter();
  const [colors, setColors] = useState(initial);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: SaleStatusColors, pendingKey: string) => {
    setPendingKey(pendingKey);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/saleStatusColors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("No se pudo guardar el color.");
    } finally {
      setPendingKey(null);
    }
  };

  const setPaymentColor = (status: PaymentStatus, color: string) => {
    const next = { ...colors, payment: { ...colors.payment, [status]: color } };
    setColors(next);
    save(next, `payment-${status}`);
  };

  const setDeliveryColor = (status: DeliveryStatus, color: string) => {
    const next = { ...colors, delivery: { ...colors.delivery, [status]: color } };
    setColors(next);
    save(next, `delivery-${status}`);
  };

  return (
    <div className="admin-card">
      {error ? (
        <p className="admin-error" style={{ margin: "16px 16px 0" }}>
          {error}
        </p>
      ) : null}

      <div style={{ padding: 16 }}>
        <p className="admin-fieldset__title" style={{ marginBottom: 10 }}>
          Estado de pago
        </p>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {PAYMENT_STATUSES.map((s) => {
            const color = colors.payment[s.value];
            return (
              <div
                key={s.value}
                className="row"
                style={{
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  paddingLeft: 4,
                  paddingRight: 10,
                  height: 40,
                }}
              >
                <input
                  type="color"
                  value={color}
                  disabled={pendingKey === `payment-${s.value}`}
                  onChange={(e) => setPaymentColor(s.value, e.target.value)}
                  aria-label={`Color de ${s.label}`}
                  style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: "50%" }}
                />
                <span
                  className="badge badge--tag"
                  style={{ background: color, color: readableTextColor(color) }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <p className="admin-fieldset__title" style={{ marginBottom: 10 }}>
          Estado de entrega
        </p>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          {DELIVERY_STATUSES.map((s) => {
            const color = colors.delivery[s.value];
            return (
              <div
                key={s.value}
                className="row"
                style={{
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  borderRadius: 999,
                  paddingLeft: 4,
                  paddingRight: 10,
                  height: 40,
                }}
              >
                <input
                  type="color"
                  value={color}
                  disabled={pendingKey === `delivery-${s.value}`}
                  onChange={(e) => setDeliveryColor(s.value, e.target.value)}
                  aria-label={`Color de ${s.label}`}
                  style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: "50%" }}
                />
                <span
                  className="badge badge--tag"
                  style={{ background: color, color: readableTextColor(color) }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
