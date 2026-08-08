"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container">
      <div className="empty-state" style={{ paddingBlock: 160 }}>
        <span className="label" style={{ color: "var(--sale)" }}>
          Algo ha fallado
        </span>
        <h1 className="display" style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          No hemos podido cargar la página
        </h1>
        <p className="lead" style={{ textAlign: "center" }}>
          Puede ser un problema temporal de conexión con la base de datos.
          Reintenta en unos segundos.
        </p>
        {error.digest ? (
          <p className="meta">Referencia del error: {error.digest}</p>
        ) : null}
        <div className="row gap-3">
          <button type="button" className="btn" onClick={() => reset()}>
            Reintentar
          </button>
          <Link href="/" className="btn btn--ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
