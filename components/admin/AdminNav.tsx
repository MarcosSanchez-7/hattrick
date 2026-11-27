"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasPermission, type AdminPermission, type AdminRole } from "@/lib/admin-auth";
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
  /** Permiso de LECTURA que decide si el ítem se muestra -- null = siempre
   * visible para cualquier admin autenticado (ej. "Panel"). */
  permission: AdminPermission | null;
};

const ITEMS: NavItem[] = [
  { href: "/gestion-ssjblue", label: "Panel", icon: IconLayout, exact: true, permission: null },
  {
    href: "/gestion-ssjblue/inventario",
    label: "Inventario",
    icon: IconBox,
    activePrefixes: ["/gestion-ssjblue/productos"],
    permission: "products.read",
  },
  {
    href: "/gestion-ssjblue/categorias",
    label: "Categorías",
    icon: IconTag,
    permission: "categories.read",
  },
  { href: "/gestion-ssjblue/ventas", label: "Ventas", icon: IconReceipt, permission: "sales.read" },
  { href: "/gestion-ssjblue/clientes", label: "Clientes", icon: IconUser, permission: "customers.read" },
  { href: "/gestion-ssjblue/generales", label: "Generales", icon: IconSettings, permission: "patches.read" },
  { href: "/gestion-ssjblue/finanzas", label: "Finanzas", icon: IconWallet, permission: "finance.access" },
  { href: "/gestion-ssjblue/usuarios", label: "Usuarios", icon: IconUser, permission: "users.manage" },
];

// Vendedor: solo Inventario, nada más — su acceso ya está reforzado en
// proxy.ts, esto es solo para que el menú coincida con lo que puede ver.
const VENDEDOR_ITEMS: NavItem[] = [
  { href: "/gestion-ssjblue/inventario", label: "Inventario", icon: IconBox, permission: null },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  // "Generales" mezcla configuración (solo superadmin) con catálogo
  // (etiquetas/parches/QR/páginas, que editor y viewer sí leen) -- se
  // muestra si el rol tiene AL MENOS uno de los permisos reales de esa
  // página, usando patches.read como representante del grupo de catálogo
  // (ver app/gestion-ssjblue/(protected)/generales/page.tsx, que filtra
  // cada link por su propio permiso real una vez adentro).
  const items =
    role === "vendedor"
      ? VENDEDOR_ITEMS
      : ITEMS.filter((item) => item.permission === null || hasPermission(role, item.permission));

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
