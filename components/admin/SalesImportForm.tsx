"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ImportResult = {
  imported: number;
  errors: { row: number; message: string }[];
};

export function SalesImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Elegí un archivo CSV.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/sales/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo importar el archivo.");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="admin-form" onSubmit={handleSubmit}>
        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-fieldset">
          <p className="admin-fieldset__title">Archivo CSV</p>
          <p className="admin-help" style={{ marginTop: 0 }}>
            Exportá tu planilla de Google Sheets o Excel como CSV. Columnas
            requeridas (en cualquier orden): <strong>Fecha, Producto, Talla,
            Cantidad, Precio compra, Precio venta, Canal</strong>. Opcionales:
            Vendedor, Nota. El canal debe ser "Tienda física", "WhatsApp",
            "Instagram" o "Web". Estas ventas no descuentan del stock actual,
            son historial de antes de tener el sistema.
          </p>
          <div className="admin-field">
            <label htmlFor="file">Archivo</label>
            <input
              id="file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => router.push("/gestion-ssjblue/ventas")}
          >
            Volver
          </button>
          <button type="submit" className="btn btn--sm" disabled={submitting}>
            {submitting ? "Importando…" : "Importar"}
          </button>
        </div>
      </form>

      {result ? (
        <div className="admin-fieldset" style={{ marginTop: 24 }}>
          <p className="admin-fieldset__title">Resultado</p>
          <p>
            {result.imported} venta{result.imported !== 1 ? "s" : ""} importada
            {result.imported !== 1 ? "s" : ""}.
          </p>
          {result.errors.length > 0 ? (
            <>
              <p className="admin-help">
                {result.errors.length} fila{result.errors.length !== 1 ? "s" : ""}{" "}
                con errores (no se importaron):
              </p>
              <ul style={{ fontSize: "0.8125rem", color: "var(--ink-muted)" }}>
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
