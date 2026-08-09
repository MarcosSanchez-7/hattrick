import Link from "next/link";
import type { CustomBannerSettings } from "@/lib/settings";
import { JerseyArt } from "@/components/product/JerseyArt";
import { IconCheck } from "@/components/ui/Icons";

export function CustomBanner({ settings }: { settings: CustomBannerSettings }) {
  return (
    <section className="section">
      <div className="container">
        <div className="custom">
          <div className="custom__copy">
            <span className="label" style={{ color: "var(--ink-muted)" }}>
              {settings.eyebrow}
            </span>
            <h2 className="h1">{settings.title}</h2>
            <p className="lead">{settings.lead}</p>
            <ul className="custom__list">
              {settings.points.map((p) => (
                <li key={p}>
                  <IconCheck className="icon--sm" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="hero__actions">
              <Link href={settings.ctaHref} className="btn">
                {settings.ctaLabel}
              </Link>
              <span className="meta" style={{ alignSelf: "center" }}>
                {settings.priceLabel}
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
