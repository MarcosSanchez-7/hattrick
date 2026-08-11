"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/admin-auth";
import {
  IconDocument,
  IconGrid,
  IconLayout,
  IconReceipt,
  IconSettings,
  IconTag,
  IconUser,
} from "@/components/ui/Icons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Panel", icon: IconLayout, exact: true },
  { href: "/admin/productos", label: "Productos", icon: IconGrid },
  { href: "/admin/categorias", label: "Categorías", icon: IconTag },
  { href: "/admin/paginas", label: "Páginas", icon: IconDocument },
  { href: "/admin/ventas", label: "Ventas", icon: IconReceipt },
  { href: "/admin/generales", label: "Generales", icon: IconSettings },
];

const SUPERADMIN_ITEM: NavItem = {
  href: "/admin/usuarios",
  label: "Usuarios",
  icon: IconUser,
};

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const items = role === "superadmin" ? [...ITEMS, SUPERADMIN_ITEM] : ITEMS;

  return (
    <nav className="admin-nav" aria-label="Navegación del panel">
      {items.map(({ href, label, icon: Icon, exact }) => {
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
