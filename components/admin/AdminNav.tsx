"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconGrid,
  IconLayout,
  IconReceipt,
  IconSettings,
  IconTag,
} from "@/components/ui/Icons";

const ITEMS = [
  { href: "/admin", label: "Panel", icon: IconLayout, exact: true },
  { href: "/admin/productos", label: "Productos", icon: IconGrid },
  { href: "/admin/categorias", label: "Categorías", icon: IconTag },
  { href: "/admin/ventas", label: "Ventas", icon: IconReceipt },
  { href: "/admin/generales", label: "Generales", icon: IconSettings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Navegación del panel">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} data-active={active ? "true" : "false"}>
            <Icon className="icon--sm" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
