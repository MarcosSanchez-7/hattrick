"use client";

import dynamic from "next/dynamic";
import type { Customer } from "@/lib/data";

const CustomersMapView = dynamic(() => import("@/components/admin/CustomersMapView"), {
  ssr: false,
  loading: () => <div className="admin-empty">Cargando mapa…</div>,
});

export function CustomersMap({ customers }: { customers: Customer[] }) {
  return <CustomersMapView customers={customers} />;
}
