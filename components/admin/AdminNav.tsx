"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/admin-auth";
import {
  IconBox,
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
  { href: "/gestion-ssjblue", label: "Panel", icon: IconLayout, exact: true },
  { href: "/gestion-ssjblue/productos", label: "Productos", icon: IconGrid },
  { href: "/gestion-ssjblue/inventario", label: "Inventario", icon: IconBox },
  { href: "/gestion-ssjblue/categorias", label: "Categorías", icon: IconTag },
  { href: "/gestion-ssjblue/paginas", label: "Páginas", icon: IconDocument },
  { href: "/gestion-ssjblue/ventas", label: "Ventas", icon: IconReceipt },
  { href: "/gestion-ssjblue/generales", label: "Generales", icon: IconSettings },
];

const SUPERADMIN_ITEM: NavItem = {
  href: "/gestion-ssjblue/usuarios",
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
