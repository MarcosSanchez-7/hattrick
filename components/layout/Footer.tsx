import Link from "next/link";
import { LEAGUES, type Category } from "@/lib/catalog";
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

export function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__brand-logo">Hattrick</div>
            <p>
              Camisetas de fútbol oficiales, ediciones retro y personalización
              profesional. Enviamos a toda Europa desde nuestro almacén de
              Madrid.
            </p>
            <div className="footer__socials">
              <a href="#" className="footer__social" aria-label="Instagram">
                <IconInstagram />
              </a>
              <a href="#" className="footer__social" aria-label="TikTok">
                <IconTikTok />
              </a>
              <a href="#" className="footer__social" aria-label="X">
                <IconX />
              </a>
              <a href="#" className="footer__social" aria-label="YouTube">
                <IconYoutube />
              </a>
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
            <span>© {new Date().getFullYear()} HATTRICK Elite Athletics S.L.</span>
            <Link href="/legal/privacidad">Privacidad</Link>
            <Link href="/legal/cookies">Cookies</Link>
            <Link href="/legal/terminos">Términos</Link>
          </div>
          <div className="footer__pay">
            <span>VISA</span>
            <span>MASTERCARD</span>
            <span>PAYPAL</span>
            <span>APPLE PAY</span>
            <span>BIZUM</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
