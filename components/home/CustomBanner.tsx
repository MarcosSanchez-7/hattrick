import Link from "next/link";
import { JerseyArt } from "@/components/product/JerseyArt";
import { IconCheck } from "@/components/ui/Icons";

const POINTS = [
  "Tipografía y parches oficiales de LaLiga, Premier, Serie A y UEFA",
  "Nombre y dorsal termosellados, resistentes a más de 50 lavados",
  "Vista previa antes de confirmar el pedido",
  "Listo para enviar en 24 h laborables",
];

export function CustomBanner() {
  return (
    <section className="section">
      <div className="container">
        <div className="custom">
          <div className="custom__copy">
            <span className="label" style={{ color: "var(--ink-muted)" }}>
              Servicio HATTRICK
            </span>
            <h2 className="h1">Ponle tu nombre</h2>
            <p className="lead">
              Personaliza cualquier camiseta del catálogo con el nombre y el
              dorsal que quieras. Mismo acabado que el que se usa en el
              vestuario, aplicado en nuestro taller.
            </p>
            <ul className="custom__list">
              {POINTS.map((p) => (
                <li key={p}>
                  <IconCheck className="icon--sm" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="hero__actions">
              <Link href="/personalizacion" className="btn">
                Personalizar ahora
              </Link>
              <span className="meta" style={{ alignSelf: "center" }}>
                Desde 14,95 €
              </span>
            </div>
          </div>
          <div className="custom__visual">
            <JerseyArt
              colors={{
                primary: "#111111",
                secondary: "#1f1f1f",
                accent: "#ffffff",
              }}
              pattern="solid"
              uid="custom"
              number="7"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
