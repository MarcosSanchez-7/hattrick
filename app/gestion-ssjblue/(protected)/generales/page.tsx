import Link from "next/link";
import { IconArrow } from "@/components/ui/Icons";
import { AdminBackLink } from "@/components/admin/AdminBackLink";

export const metadata = { title: "Generales" };

const SECTIONS = [
  {
    href: "/gestion-ssjblue/generales/branding",
    title: "Branding",
    description: "Favicon / ícono del sitio (pestaña del navegador).",
  },
  {
    href: "/gestion-ssjblue/generales/home",
    title: "Secciones de la home",
    description: "Mostrar u ocultar bloques como \"Nuevos ingresos\".",
  },
  {
    href: "/gestion-ssjblue/generales/hero",
    title: "Portada (Hero)",
    description: "Titular, texto, botones y estadísticas de la home.",
  },
  {
    href: "/gestion-ssjblue/generales/informacion",
    title: "Franja de información",
    description: "Los 4 ítems (envío, personalización, etc.) debajo del Hero.",
  },
  {
    href: "/gestion-ssjblue/generales/navbar",
    title: "Menú y avisos",
    description: "Mensajes de la barra superior y enlaces extra del menú.",
  },
  {
    href: "/gestion-ssjblue/generales/footer",
    title: "Footer",
    description: "Descripción de la marca, redes sociales y datos legales.",
  },
  {
    href: "/gestion-ssjblue/generales/personalizacion",
    title: "Banner de personalización",
    description: "El bloque \"Ponle tu nombre\" de la home.",
  },
  {
    href: "/gestion-ssjblue/categorias",
    title: "Categorías",
    description: "Crear, editar y eliminar categorías del catálogo.",
  },
  {
    href: "/gestion-ssjblue/generales/etiquetas",
    title: "Etiquetas",
    description: "Etiquetas estandarizadas con color para los productos.",
  },
  {
    href: "/gestion-ssjblue/generales/avisos",
    title: "Avisos del producto",
    description: "Avisos por defecto bajo \"Añadir al carrito\" (editables por categoría).",
  },
  {
    href: "/gestion-ssjblue/generales/detalles-producto",
    title: "Detalles y envíos del producto",
    description: "Las secciones \"Detalles y composición\" y \"Envíos y devoluciones\" de la ficha.",
  },
];

export default function GeneralesPage() {
  return (
    <>
      <AdminBackLink href="/gestion-ssjblue" label="Panel" />
      <div className="admin-page-head">
        <div>
          <h1 className="h1">Generales</h1>
          <p className="lead" style={{ marginTop: 8, fontSize: "0.9375rem" }}>
            Configuración del sitio que no depende de un producto en concreto.
            Iremos sumando más secciones aquí.
          </p>
        </div>
      </div>

      <div className="admin-form__grid" style={{ maxWidth: 900 }}>
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="admin-fieldset admin-generales-card">
            <p className="h3">{s.title}</p>
            <p className="meta" style={{ marginTop: 6 }}>
              {s.description}
            </p>
            <span className="cats__go" style={{ marginTop: 12 }}>
              Editar
              <IconArrow className="icon--sm" />
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
