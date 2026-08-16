"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/admin-auth";
import {
  IconBox,
  IconLayout,
  IconReceipt,
  IconSettings,
  IconTag,
  IconUser,
  IconWallet,
} from "@/components/ui/Icons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  exact?: boolean;
  /** Prefijos extra que también marcan este ítem como activo (rutas hijas fuera de `href`). */
  activePrefixes?: string[];
};

const ITEMS: NavItem[] = [
  { href: "/gestion-ssjblue", label: "Panel", icon: IconLayout, exact: true },
  {
    href: "/gestion-ssjblue/inventario",
    label: "Inventario",
    icon: IconBox,
    activePrefixes: ["/gestion-ssjblue/productos"],
  },
  { href: "/gestion-ssjblue/categorias", label: "Categorías", icon: IconTag },
  { href: "/gestion-ssjblue/ventas", label: "Ventas", icon: IconReceipt },
  { href: "/gestion-ssjblue/clientes", label: "Clientes", icon: IconUser },
  { href: "/gestion-ssjblue/generales", label: "Generales", icon: IconSettings },
];

const SUPERADMIN_ITEMS: NavItem[] = [
  { href: "/gestion-ssjblue/finanzas", label: "Finanzas", icon: IconWallet },
  { href: "/gestion-ssjblue/usuarios", label: "Usuarios", icon: IconUser },
];

// Vendedor: solo Inventario, nada más — su acceso ya está reforzado en
// proxy.ts, esto es solo para que el menú coincida con lo que puede ver.
const VENDEDOR_ITEMS: NavItem[] = [
  { href: "/gestion-ssjblue/inventario", label: "Inventario", icon: IconBox },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const items =
    role === "vendedor"
      ? VENDEDOR_ITEMS
      : role === "superadmin"
        ? [...ITEMS, ...SUPERADMIN_ITEMS]
        : ITEMS;

  return (
    <nav className="admin-nav" aria-label="Navegación del panel">
      {items.map(({ href, label, icon: Icon, exact, activePrefixes }) => {
        const active = exact
          ? pathname === href
          : pathname.startsWith(href) ||
            (activePrefixes?.some((p) => pathname.startsWith(p)) ?? false);
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
