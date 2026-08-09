import Link from "next/link";
import { IconArrow } from "@/components/ui/Icons";

export const metadata = { title: "Generales" };

const SECTIONS = [
  {
    href: "/admin/generales/hero",
    title: "Portada (Hero)",
    description: "Titular, texto, botones y estadísticas de la home.",
  },
  {
    href: "/admin/generales/navbar",
    title: "Menú y avisos",
    description: "Mensajes de la barra superior y enlaces extra del menú.",
  },
  {
    href: "/admin/generales/footer",
    title: "Footer",
    description: "Descripción de la marca, redes sociales y datos legales.",
  },
  {
    href: "/admin/categorias",
    title: "Categorías",
    description: "Crear, editar y eliminar categorías del catálogo.",
  },
];

export default function GeneralesPage() {
  return (
    <>
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
