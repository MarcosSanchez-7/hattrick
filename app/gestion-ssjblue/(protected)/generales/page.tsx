import Link from "next/link";
import {
  IconBox,
  IconChevron,
  IconDocument,
  IconExpand,
  IconExternal,
  IconFolder,
  IconGrid,
  IconLayout,
  IconMenu,
  IconPalette,
  IconPrint,
  IconShield,
  IconStar,
  IconTag,
  IconTruck,
  type IconProps,
} from "@/components/ui/Icons";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { getCurrentAdmin } from "@/lib/admin-session";
import { hasPermission, type AdminPermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Generales" };

type Section = {
  href: string;
  title: string;
  description: string;
  icon: (props: IconProps) => React.ReactElement;
  /** Qué permiso de LECTURA necesita el admin actual para ver este link --
   * "Generales" mezcla configuración real (solo superadmin) con recursos
   * de catálogo que viven en esta misma URL (etiquetas/parches/QR/páginas),
   * así que no hay un único permiso para toda la página. */
  permission: AdminPermission;
};

const GROUPS: { title: string; sections: Section[] }[] = [
  {
    title: "Home",
    sections: [
      {
        href: "/gestion-ssjblue/generales/hero",
        title: "Portada (Hero)",
        description: "Titular, texto, botones y estadísticas de la home.",
        icon: IconExpand,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/home",
        title: "Secciones de la home",
        description: "Mostrar u ocultar bloques como \"Nuevos ingresos\".",
        icon: IconLayout,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/informacion",
        title: "Franja de información",
        description: "Los 4 ítems (envío, personalización, etc.) debajo del Hero.",
        icon: IconTruck,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/personalizacion",
        title: "Banner de personalización",
        description: "El bloque \"Ponle tu nombre\" de la home.",
        icon: IconPrint,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/resenas",
        title: "Reseñas",
        description: "Capturas de conversaciones de entrega o paquetes listos.",
        icon: IconStar,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/dtf",
        title: "Taller DTF",
        description: "Vidriera destacada de estampados DTF, después de Ofertas.",
        icon: IconPrint,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/mayorista",
        title: "Mayorista",
        description: "Página de venta por docena + el mensaje flotante que la promociona.",
        icon: IconBox,
        permission: "settings.write",
      },
    ],
  },
  {
    title: "Catálogo",
    sections: [
      {
        href: "/gestion-ssjblue/categorias",
        title: "Categorías",
        description: "Crear, editar y eliminar categorías del catálogo.",
        icon: IconFolder,
        permission: "categories.read",
      },
      {
        href: "/gestion-ssjblue/generales/etiquetas",
        title: "Etiquetas",
        description: "Etiquetas estandarizadas con color para los productos.",
        icon: IconTag,
        permission: "tags.read",
      },
      {
        href: "/gestion-ssjblue/generales/parches",
        title: "Parches",
        description: "Catálogo de parches de ligas/competiciones, con precio.",
        icon: IconShield,
        permission: "patches.read",
      },
      {
        href: "/gestion-ssjblue/generales/avisos",
        title: "Avisos del producto",
        description: "Avisos bajo \"Añadir al carrito\" (editables por categoría).",
        icon: IconDocument,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/detalles-producto",
        title: "Envíos del producto",
        description: "El texto de \"Envíos y devoluciones\" de la ficha.",
        icon: IconTruck,
        permission: "settings.write",
      },
    ],
  },
  {
    title: "Ventas",
    sections: [
      {
        href: "/gestion-ssjblue/generales/estados-venta",
        title: "Colores de estados de venta",
        description: "El color de cada pastilla de pago y de entrega.",
        icon: IconPalette,
        permission: "settings.write",
      },
    ],
  },
  {
    title: "Sitio",
    sections: [
      {
        href: "/gestion-ssjblue/generales/branding",
        title: "Branding",
        description: "Favicon / ícono del sitio (pestaña del navegador).",
        icon: IconGrid,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/navbar",
        title: "Menú y avisos",
        description: "Mensajes de la barra superior y enlaces extra del menú.",
        icon: IconMenu,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/generales/footer",
        title: "Footer",
        description: "Descripción de la marca, redes sociales y datos legales.",
        icon: IconLayout,
        permission: "settings.write",
      },
      {
        href: "/gestion-ssjblue/paginas",
        title: "Páginas",
        description: "Términos, privacidad, envíos, contacto y demás textos.",
        icon: IconDocument,
        permission: "pages.read",
      },
      {
        href: "/gestion-ssjblue/generales/qr",
        title: "Códigos QR",
        description: "Links rastreables — cuánta gente entra por cada uno.",
        icon: IconExternal,
        permission: "qr.read",
      },
    ],
  },
];

export default async function GeneralesPage() {
  // Sin redirect acá: "Generales" en sí no tiene un único permiso -- cada
  // link se filtra por el suyo. Un admin sin ninguno de los permisos de
  // esta página vería los grupos vacíos (no debería llegar a pasar desde
  // la navegación real, que ya los oculta en el panel principal).
  const admin = await getCurrentAdmin();
  const role = admin?.role ?? null;

  const visibleGroups = GROUPS.map((group) => ({
    title: group.title,
    sections: group.sections.filter((s) => role !== null && hasPermission(role, s.permission)),
  })).filter((group) => group.sections.length > 0);

  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Generales</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Configuración del sitio que no depende de un producto en concreto.
          </p>
        </div>
      </div>

      <div className="admin-settings-groups">
        {visibleGroups.map((group) => (
          <div key={group.title} className="admin-settings-group">
            <p className="admin-settings-group__title">{group.title}</p>
            {group.sections.map((s) => (
              <Link key={s.href} href={s.href} className="admin-settings-row">
                <span className="admin-settings-row__icon">
                  <s.icon className="icon--sm" />
                </span>
                <span className="admin-settings-row__body">
                  <span className="admin-settings-row__title">{s.title}</span>
                  <span className="admin-settings-row__desc">{s.description}</span>
                </span>
                <IconChevron className="icon--sm admin-settings-row__chevron" />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
