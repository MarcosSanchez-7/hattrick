import { formatPrice } from "@/lib/format";

/**
 * Contenido general del sitio editable desde /admin/generales: hero, footer
 * y navbar. Se guarda en la tabla site_settings (clave -> jsonb) para poder
 * seguir añadiendo ajustes sin migraciones nuevas cada vez.
 */

export type HeroSettings = {
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  lead: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  stats: { value: string; label: string }[];
  /** Slug del producto a destacar. Vacío = se elige uno automáticamente. */
  featuredProductSlug: string;
};

export const DEFAULT_HERO: HeroSettings = {
  eyebrow: "Temporada 25/26 · Mundial 2026",
  headlineLine1: "La camiseta",
  headlineLine2: "hace al equipo",
  lead: "Equipaciones oficiales de clubes y selecciones, reediciones retro y personalización profesional con el tipo de letra de cada liga. Sin réplicas, sin sorpresas.",
  primaryCtaLabel: "Comprar novedades",
  primaryCtaHref: "/novedades",
  secondaryCtaLabel: "Ver ofertas",
  secondaryCtaHref: "/ofertas",
  stats: [
    { value: "120+", label: "Equipaciones en stock" },
    { value: "48 h", label: "Entrega en 48 horas" },
    { value: "4,9/5", label: "1.240 valoraciones" },
  ],
  featuredProductSlug: "",
};

export type FooterSettings = {
  brandDescription: string;
  instagramUrl: string;
  tiktokUrl: string;
  xUrl: string;
  youtubeUrl: string;
  legalName: string;
  paymentMethods: string[];
};

export const DEFAULT_FOOTER: FooterSettings = {
  brandDescription:
    "Camisetas de fútbol oficiales, ediciones retro y personalización profesional. Envíos a todo Paraguay.",
  instagramUrl: "",
  tiktokUrl: "",
  xUrl: "",
  youtubeUrl: "",
  legalName: "HATTRICK",
  paymentMethods: ["VISA", "MASTERCARD", "TRANSFERENCIA", "EFECTIVO"],
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
  ctaLabel: "Personalizar ahora",
  ctaHref: "/personalizacion",
  priceLabel: "Desde Gs. 120.000",
};

export type SiteSettingsKey = "hero" | "footer" | "navbar" | "customBanner";
