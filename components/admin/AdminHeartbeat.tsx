"use client";

import { useEffect } from "react";

const INTERVAL_MS = 60_000;

/** Sin UI — solo avisa "sigo acá" cada minuto mientras el panel está
 * abierto, para que Usuarios pueda mostrar quién está conectado. */
export function AdminHeartbeat() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/admin/heartbeat", { method: "POST", keepalive: true }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
