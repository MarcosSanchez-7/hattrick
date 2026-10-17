import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/data";
import { DEFAULT_FOOTER, DEFAULT_WHOLESALE } from "@/lib/settings";
import { imageVariant } from "@/lib/image";
import { JerseyArt } from "@/components/product/JerseyArt";
import { IconCheck } from "@/components/ui/Icons";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Mayorista",
  description: "Camisetas por docena cerrada a precio especial para revendedores.",
  alternates: { canonical: "/mayorista" },
};

export default async function MayoristaPage() {
  const [settings, footerSettings] = await Promise.all([
    getSetting("wholesale", DEFAULT_WHOLESALE),
    getSetting("footer", DEFAULT_FOOTER),
  ]);

  const waHref = footerSettings.whatsappNumber
    ? `https://wa.me/${footerSettings.whatsappNumber}?text=${encodeURIComponent(settings.whatsappMessage)}`
    : undefined;

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Mayorista</span>
          </nav>
        </div>
      </header>

      <section className="section">
        <div className="container">
          <div className="custom">
            <div className="custom__copy">
              <span className="label" style={{ color: "var(--ink-muted)" }}>
                {settings.eyebrow}
              </span>
              <h1 className="h1">{settings.title}</h1>
              <p className="lead">{settings.lead}</p>
              {settings.points.length > 0 ? (
                <ul className="custom__list">
                  {settings.points.map((p) => (
                    <li key={p}>
                      <IconCheck className="icon--sm" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="hero__actions">
                {waHref ? (
                  <Link href={waHref} target="_blank" rel="noopener noreferrer" className="btn">
                    {settings.ctaLabel}
                  </Link>
                ) : null}
                {settings.priceLabel ? (
                  <span className="meta" style={{ alignSelf: "center" }}>
                    {settings.priceLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="custom__visual">
              {settings.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageVariant(settings.image, "full")}
                  alt="Camisetas por docena para mayoristas"
                  className="custom__visual-img"
                />
              ) : (
                <JerseyArt
                  colors={{ primary: "#111111", secondary: "#1f1f1f", accent: "#ffffff" }}
                  pattern="solid"
                  uid="wholesale"
                  number="12"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
