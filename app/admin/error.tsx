"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
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
    <div className="admin-empty" style={{ paddingBlock: 96 }}>
      <h2 className="h2">No se pudo cargar el panel</h2>
      <p className="meta" style={{ marginTop: 8 }}>
        Probablemente sea un problema de conexión con Supabase (claves mal
        configuradas o caída temporal).
      </p>
      {error.digest ? (
        <p className="meta" style={{ marginTop: 4 }}>
          Referencia del error: {error.digest}
        </p>
      ) : null}
      <div className="row gap-3" style={{ justifyContent: "center", marginTop: 16 }}>
        <button type="button" className="btn btn--sm" onClick={() => reset()}>
          Reintentar
        </button>
        <Link href="/admin" className="btn btn--ghost btn--sm">
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
