import { formatPrice } from "@/lib/format";
import type { ProductNotice } from "@/lib/catalog";

/**
 * Contenido general del sitio editable desde /admin/generales: hero, footer
 * y navbar. Se guarda en la tabla site_settings (clave -> jsonb) para poder
 * seguir añadiendo ajustes sin migraciones nuevas cada vez.
 */

/**
 * Un "flyer" a pantalla completa del hero. Sin autoplay a propósito (los
 * carruseles automáticos pierden casi todo el clic en el segundo slide en
 * adelante) — el cliente navega con flechas/puntos si hay más de uno.
 */
export type HeroSlide = {
  id: string;
  /** URL de la imagen (subida o pegada) que ocupa todo el ancho del hero. */
  image: string;
  eyebrow: string;
  headline: string;
  ctaLabel: string;
  ctaHref: string;
};

export type HeroSettings = {
  slides: HeroSlide[];
  /** Franja chica de datos de confianza debajo del flyer. */
  stats: { value: string; label: string }[];
};

export const DEFAULT_HERO: HeroSettings = {
  slides: [
    {
      id: "default",
      image: "",
      eyebrow: "Temporada 25/26 · Mundial 2026",
      headline: "La camiseta hace al equipo",
      ctaLabel: "Comprar novedades",
      ctaHref: "/novedades",
    },
  ],
  stats: [
    { value: "120+", label: "Equipaciones en stock" },
    { value: "48 h", label: "Entrega en 48 horas" },
    { value: "4,9/5", label: "1.240 valoraciones" },
  ],
};

export type FooterSettings = {
  brandDescription: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
  youtubeUrl: string;
  legalName: string;
  /** Sólo números, con código de país (ej. 595981234567). Vacío = sin botón flotante. */
  whatsappNumber: string;
};

export const DEFAULT_FOOTER: FooterSettings = {
  brandDescription:
    "Camisetas de fútbol oficiales, ediciones retro y personalización profesional. Envíos a todo Paraguay.",
  instagramUrl: "",
  tiktokUrl: "",
  xUrl: "",
  youtubeUrl: "",
  legalName: "HATTRICK",
  whatsappNumber: "",
};

export type NavLink = { label: string; href: string };

export type NavbarSettings = {
  /** Mensajes que rotan en la barra superior. */
  announcements: string[];
  /** Enlaces adicionales al final del menú principal (además de las categorías). */
  extraLinks: NavLink[];
};

export const DEFAULT_NAVBAR: NavbarSettings = {
  announcements: [
    `Envío gratis desde ${formatPrice(640000)}`,
    "Personalización oficial en 24 h",
    "Devoluciones gratuitas 30 días",
  ],
  extraLinks: [],
};

export type CustomBannerSettings = {
  eyebrow: string;
  title: string;
  lead: string;
  points: string[];
  ctaLabel: string;
  ctaHref: string;
  priceLabel: string;
  /** Fotos de ejemplos de personalización. Vacío = se usa la ilustración genérica. */
  images: string[];
};

export const DEFAULT_CUSTOM_BANNER: CustomBannerSettings = {
  eyebrow: "Servicio HATTRICK",
  title: "Ponle tu nombre",
  lead: "Personaliza cualquier camiseta del catálogo con el nombre y el dorsal que quieras. Mismo acabado que el que se usa en el vestuario, aplicado en nuestro taller.",
  points: [
    "Tipografía y parches oficiales de LaLiga, Premier, Serie A y UEFA",
    "Nombre y dorsal termosellados, resistentes a más de 50 lavados",
    "Vista previa antes de confirmar el pedido",
    "Listo para enviar en 24 h laborables",
  ],
  images: [],
  ctaLabel: "Personalizar ahora",
  ctaHref: "/personalizacion",
  priceLabel: "Desde Gs. 120.000",
};

export type HomeSettings = {
  /** Se activa solo cuando hay mucho stock nuevo cargado; si no, no vale la pena la sección. */
  showNewArrivals: boolean;
};

export const DEFAULT_HOME: HomeSettings = {
  showNewArrivals: false,
};

export type ProductNoticesSettings = {
  /** Avisos que se muestran en cualquier producto cuya categoría no tenga los suyos propios. */
  defaultNotices: ProductNotice[];
};

export const DEFAULT_PRODUCT_NOTICES: ProductNoticesSettings = {
  defaultNotices: [
    {
      icon: "truck",
      text: `Entrega estimada en 48 h · Gratis desde ${formatPrice(640000)}`,
    },
    {
      icon: "print",
      text: `Personalización oficial disponible desde ${formatPrice(120000)}`,
    },
    { icon: "return", text: "30 días para cambiar la talla sin coste" },
  ],
};

export type SiteSettingsKey =
  | "hero"
  | "footer"
  | "navbar"
  | "customBanner"
  | "home"
  | "productNotices";
