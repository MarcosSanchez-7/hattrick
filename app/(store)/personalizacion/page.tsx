import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/lib/data";
import { DEFAULT_CUSTOM_BANNER, DEFAULT_PERSONALIZATION_GALLERY } from "@/lib/settings";
import { imageVariant } from "@/lib/image";
import { CustomBanner } from "@/components/home/CustomBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Personalización",
  description: "Personaliza cualquier camiseta del catálogo con nombre y dorsal.",
  alternates: { canonical: "/personalizacion" },
};

export default async function PersonalizacionPage() {
  const [settings, gallery] = await Promise.all([
    getSetting("customBanner", DEFAULT_CUSTOM_BANNER),
    getSetting("personalizationGallery", DEFAULT_PERSONALIZATION_GALLERY),
  ]);

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Personalización</span>
          </nav>
        </div>
      </header>

      <CustomBanner settings={settings} />

      {gallery.posts.length > 0 ? (
        <section className="section section--soft">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="label section-head__eyebrow">
                  Trabajos realizados
                </span>
                <h2 className="h1">Personalizaciones ya entregadas</h2>
              </div>
            </div>
            <div className="photo-grid">
              {gallery.posts.map((post) => (
                <div key={post.id} className="photo-grid__item">
                  <div className="photo-grid__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageVariant(post.image, "card")}
                      alt={post.caption || "Personalización HATTRICK"}
                      loading="lazy"
                    />
                  </div>
                  {post.caption ? <p className="meta">{post.caption}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
