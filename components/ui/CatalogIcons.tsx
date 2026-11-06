import type { ReactElement } from "react";
import {
  IconDiamond,
  IconFlagStripes,
  IconGlobe,
  IconHome,
  IconHourglass,
  IconMapPin,
  IconMedal,
  IconPremierLeague,
  IconSerieA,
  IconStar,
  IconSun,
  IconTag,
  IconTrophy,
  type IconProps,
} from "@/components/ui/Icons";

type IconComponent = (props: IconProps) => ReactElement;

/** Subcategorías de fútbol (y cualquier otra con el mismo slug en otra
 * sección) -- por slug, no por nombre, para no romper si el admin renombra
 * la categoría (ver corrección de mayúsculas de categorías). */
export const SUBCATEGORY_ICONS: Record<string, IconComponent> = {
  europa: IconGlobe,
  sudamerica: IconMapPin,
  "mundial-2026": IconTrophy,
  "retro-2": IconHourglass,
};

/** Etiquetas "de filtro" (ligas/competiciones, ver tags.is_filter) -- por
 * nombre exacto de la etiqueta. Premier League y Serie A usan el logo real
 * de la competición (SVG provisto por el usuario); el resto son íconos
 * genéricos (no logos oficiales, para no meterse en temas de marca). Liga
 * Paraguaya usa una casita a propósito (es la liga local de la tienda).
 * Sin ícono bueno en este set para ligas/deportes que todavía no cargamos
 * (ej. F1, NBA): cae en DEFAULT_TAG_ICON en vez de romper o dejar un hueco
 * vacío. */
export const TAG_ICONS: Record<string, IconComponent> = {
  "Premier League": IconPremierLeague,
  "La Liga": IconSun,
  "Serie A": IconSerieA,
  Bundesliga: IconStar,
  "Ligue 1": IconDiamond,
  Brasileirao: IconMedal,
  "Liga Argentina": IconFlagStripes,
  "Liga Paraguaya": IconHome,
};

export const DEFAULT_TAG_ICON: IconComponent = IconTag;
