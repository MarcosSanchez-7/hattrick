"use client";

import { useState } from "react";
import type { Supplier } from "@/lib/catalog";

export type SelectedSupplier = {
  supplierId: string;
  unitCost: string;
  /** Talla -> cantidad comprada a ese proveedor (texto, como el resto de
   * inputs controlados del formulario). Solo se listan tallas con algo
   * cargado; el resto no necesita entrada explícita en 0. */
  sizeQuantities: Record<string, string>;
};

/**
 * Chips de proveedores (toggle) + precio de compra, más un desglose de
 * cuántas unidades de cada talla real del producto salieron de ese
 * proveedor — así Ventas puede filtrar, al elegir una talla, qué
 * proveedores tienen stock de ESA talla puntual. El precio sigue siendo
 * uno solo por proveedor (no varía por talla).
 */
export function SupplierPicker({
  catalog,
  value,
  onChange,
  onCatalogChange,
  sizes,
}: {
  catalog: Supplier[];
  value: SelectedSupplier[];
  onChange: (value: SelectedSupplier[]) => void;
  onCatalogChange: (catalog: Supplier[]) => void;
  /** Tallas actualmente cargadas para el producto (stock propio) — define
   * qué chips de talla se ofrecen para desglosar cantidad por proveedor. */
  sizes: string[];
}) {
  const [newSupplier, setNewSupplier] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (supplierId: string) => {
    const included = value.some((v) => v.supplierId === supplierId);
    onChange(
      included
        ? value.filter((v) => v.supplierId !== supplierId)
        : [...value, { supplierId, unitCost: "", sizeQuantities: {} }],
    );
  };

  const setCost = (supplierId: string, unitCost: string) => {
    onChange(
      value.map((v) => (v.supplierId === supplierId ? { ...v, unitCost } : v)),
    );
  };

  const setSizeQuantity = (supplierId: string, size: string, quantity: string) => {
    onChange(
      value.map((v) =>
        v.supplierId === supplierId
          ? { ...v, sizeQuantities: { ...v.sizeQuantities, [size]: quantity } }
          : v,
      ),
    );
  };

  const handleCreate = async () => {
    const name = newSupplier.trim();
    if (!name) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el proveedor.");
      onCatalogChange([...catalog, data]);
      onChange([...value, { supplierId: data.id, unitCost: "", sizeQuantities: {} }]);
      setNewSupplier("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-variant-list">
        {catalog.map((supplier) => {
          const selected = value.find((v) => v.supplierId === supplier.id);
          return (
            <div
              key={supplier.id}
              className="admin-variant-row"
              style={{ flexWrap: "wrap", alignItems: "flex-start" }}
            >
              <label
                className="admin-check"
                data-checked={selected ? "true" : "false"}
              >
                <input
                  type="checkbox"
                  checked={Boolean(selected)}
                  onChange={() => toggle(supplier.id)}
                />
                {supplier.name}
              </label>
              {selected ? (
                <div
                  className="row gap-2"
                  style={{ flexWrap: "wrap", alignItems: "center", flex: 1 }}
                >
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    className="admin-variant-qty"
                    value={selected.unitCost}
                    onChange={(e) => setCost(supplier.id, e.target.value)}
                    placeholder="Precio de compra"
                    aria-label={`Precio de compra a ${supplier.name}`}
                  />
                  {sizes.length > 0 ? (
                    sizes.map((size) => (
                      <label
                        key={size}
                        className="row gap-1"
                        style={{ alignItems: "center", gap: 4 }}
                      >
                        <span className="meta">{size}</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="admin-variant-qty"
                          style={{ width: 56 }}
                          value={selected.sizeQuantities[size] ?? ""}
                          onChange={(e) => setSizeQuantity(supplier.id, size, e.target.value)}
                          aria-label={`Unidades de talla ${size} de ${supplier.name}`}
                        />
                      </label>
                    ))
                  ) : (
                    <p className="admin-help" style={{ margin: 0 }}>
                      Cargá las tallas del producto para desglosar cantidad por talla.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {catalog.length === 0 ? (
          <p className="admin-help" style={{ margin: 0 }}>
            Todavía no hay proveedores cargados — crea uno abajo.
          </p>
        ) : null}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <input
          type="text"
          value={newSupplier}
          onChange={(e) => setNewSupplier(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Nuevo proveedor (ej. Proveedor Ciudad del Este)"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={creating || !newSupplier.trim()}
          onClick={handleCreate}
        >
          {creating ? "Creando…" : "Crear y añadir"}
        </button>
      </div>
    </div>
  );
}
