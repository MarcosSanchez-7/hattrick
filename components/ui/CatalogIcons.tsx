import type { ReactElement } from "react";
import {
  IconBrasileirao,
  IconBundesliga,
  IconGlobe,
  IconHourglass,
  IconLaLiga,
  IconLigaArgentina,
  IconLigaParaguaya,
  IconLigue1,
  IconMapPin,
  IconNBA,
  IconPremierLeague,
  IconSerieA,
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
 * nombre exacto de la etiqueta. Todas usan el logo/escudo real de la
 * competición (SVG oficial, provisto por el usuario), no íconos genéricos.
 * Sin ícono cargado todavía para alguna liga/deporte nuevo: cae en
 * DEFAULT_TAG_ICON en vez de romper o dejar un hueco vacío. */
export const TAG_ICONS: Record<string, IconComponent> = {
  "Premier League": IconPremierLeague,
  "La Liga": IconLaLiga,
  "Serie A": IconSerieA,
  Bundesliga: IconBundesliga,
  "Ligue 1": IconLigue1,
  Brasileirao: IconBrasileirao,
  "Liga Argentina": IconLigaArgentina,
  "Liga Paraguaya": IconLigaParaguaya,
  NBA: IconNBA,
};

export const DEFAULT_TAG_ICON: IconComponent = IconTag;
