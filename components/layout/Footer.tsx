import Link from "next/link";
import { LEAGUES, type Category } from "@/lib/catalog";
import type { FooterSettings } from "@/lib/settings";
import {
  IconInstagram,
  IconTikTok,
  IconX,
  IconYoutube,
} from "@/components/ui/Icons";

const AYUDA = [
  ["Envíos y plazos", "/ayuda/envios"],
  ["Devoluciones", "/ayuda/devoluciones"],
  ["Guía de tallas", "/ayuda/tallas"],
  ["Personalización", "/personalizacion"],
  ["Seguimiento de pedido", "/ayuda/pedido"],
  ["Contacto", "/ayuda/contacto"],
];

const EMPRESA = [
  ["Sobre HATTRICK", "/sobre-nosotros"],
  ["Tiendas físicas", "/tiendas"],
  ["Autenticidad", "/autenticidad"],
  ["Programa de socios", "/socios"],
  ["Trabaja con nosotros", "/empleo"],
];

const SOCIALS: { key: keyof FooterSettings; icon: typeof IconInstagram; label: string }[] = [
  { key: "instagramUrl", icon: IconInstagram, label: "Instagram" },
  { key: "tiktokUrl", icon: IconTikTok, label: "TikTok" },
  { key: "xUrl", icon: IconX, label: "X" },
  { key: "youtubeUrl", icon: IconYoutube, label: "YouTube" },
];

export function Footer({
  categories,
  settings,
}: {
  categories: Category[];
  settings: FooterSettings;
}) {
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
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categoria/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <p className="label footer__col-title">Ligas</p>
            <ul>
              {LEAGUES.map((l) => (
                <li key={l}>
                  <Link href={`/buscar?q=${encodeURIComponent(l)}`}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <p className="label footer__col-title">Ayuda</p>
            <ul>
              {AYUDA.map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <p className="label footer__col-title">Empresa</p>
            <ul>
              {EMPRESA.map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__legal">
            <span>
              © {new Date().getFullYear()} {settings.legalName}
            </span>
            <Link href="/legal/privacidad">Privacidad</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/terminos">Términos</Link>
          </div>
          <div className="footer__pay">
            {settings.paymentMethods.map((method) => (
              <span key={method}>{method}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
