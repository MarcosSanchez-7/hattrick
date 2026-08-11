import Link from "next/link";
import { topLevelCategories, type Category, type Page } from "@/lib/catalog";
import type { FooterSettings } from "@/lib/settings";
import {
  IconInstagram,
  IconTikTok,
  IconX,
  IconYoutube,
} from "@/components/ui/Icons";

const SOCIALS: { key: keyof FooterSettings; icon: typeof IconInstagram; label: string }[] = [
  { key: "instagramUrl", icon: IconInstagram, label: "Instagram" },
  { key: "tiktokUrl", icon: IconTikTok, label: "TikTok" },
  { key: "xUrl", icon: IconX, label: "X" },
  { key: "youtubeUrl", icon: IconYoutube, label: "YouTube" },
];

export function Footer({
  categories,
  settings,
  pages,
}: {
  categories: Category[];
  settings: FooterSettings;
  pages: Page[];
}) {
  const ayuda = pages.filter((p) => p.placement === "ayuda");
  const empresa = pages.filter((p) => p.placement === "empresa");
  const legal = pages.filter((p) => p.placement === "legal");

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__brand-logo">Hattrick</div>
            <p>{settings.brandDescription}</p>
            <div className="footer__socials">
              {SOCIALS.map(({ key, icon: Icon, label }) => {
                const href = settings[key] as string;
                if (!href) return null;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="footer__social"
                    aria-label={label}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="footer__col">
            <p className="label footer__col-title">Tienda</p>
            <ul>
              <li>
                <Link href="/novedades">Nuevos ingresos</Link>
              </li>
              <li>
                <Link href="/ofertas">Ofertas</Link>
              </li>
              {topLevelCategories(categories).map((c) => (
                <li key={c.slug}>
                  <Link href={`/categoria/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <p className="label footer__col-title">Ayuda</p>
            <ul>
              <li>
                <Link href="/personalizacion">Personalización</Link>
              </li>
              {ayuda.map((p) => (
                <li key={p.slug}>
                  <Link href={`/pagina/${p.slug}`}>{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          {empresa.length > 0 ? (
            <div className="footer__col">
              <p className="label footer__col-title">Empresa</p>
              <ul>
                {empresa.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/pagina/${p.slug}`}>{p.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="footer__bottom">
          <div className="footer__legal">
            <span>
              © {new Date().getFullYear()} {settings.legalName}
            </span>
            {legal.map((p) => (
              <Link key={p.slug} href={`/pagina/${p.slug}`}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
