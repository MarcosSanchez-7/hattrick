"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** El registro del escaneo ya pasó (server-side, antes de renderizar esto).
 * Este componente solo existe para que la página realmente se sirva y
 * Vercel Analytics la cuente como visita — un redirect() de servidor puro
 * no llega a cargar el script de analytics. */
export function QrRedirect({ to = "/" }: { to?: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      <p style={{ fontFamily: "sans-serif", color: "#888", fontSize: 14 }}>
        Redirigiendo…
      </p>
    </div>
  );
}
