import { NextRequest, NextResponse } from "next/server";
import { DataError, getSetting, updateSetting } from "@/lib/data";
import {
  revalidateAfterWrite,
  safeRevalidatePaths,
  settingsRevalidationEntries,
  type SettingsRevalidationRule,
} from "@/lib/revalidate";
import {
  DEFAULT_BRANDING,
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_DTF,
  DEFAULT_FOOTER,
  DEFAULT_HERO,
  DEFAULT_HOME,
  DEFAULT_NAVBAR,
  DEFAULT_PERSONALIZATION_GALLERY,
  DEFAULT_PRODUCT_INFO,
  DEFAULT_PRODUCT_NOTICES,
  DEFAULT_REVIEWS,
  DEFAULT_SALE_STATUS_COLORS,
  DEFAULT_VALUE_PROPS,
  DEFAULT_WHOLESALE,
  type SiteSettingsKey,
} from "@/lib/settings";

const DEFAULTS: Record<SiteSettingsKey, unknown> = {
  hero: DEFAULT_HERO,
  footer: DEFAULT_FOOTER,
  navbar: DEFAULT_NAVBAR,
  customBanner: DEFAULT_CUSTOM_BANNER,
  home: DEFAULT_HOME,
  productNotices: DEFAULT_PRODUCT_NOTICES,
  productInfo: DEFAULT_PRODUCT_INFO,
  valueProps: DEFAULT_VALUE_PROPS,
  branding: DEFAULT_BRANDING,
  personalizationGallery: DEFAULT_PERSONALIZATION_GALLERY,
  reviews: DEFAULT_REVIEWS,
  saleStatusColors: DEFAULT_SALE_STATUS_COLORS,
  dtf: DEFAULT_DTF,
  wholesale: DEFAULT_WHOLESALE,
};

function isValidKey(key: string): key is SiteSettingsKey {
  return key in DEFAULTS;
}

/**
 * Qué rutas públicas puede afectar cada ajuste -- releído de los
 * consumidores reales (`grep getSetting("<key>"` en app/(store)), no
 * supuesto:
 *
 * - "global": se lee en app/(store)/layout.tsx, compartido por TODAS las
 *   rutas públicas (Navbar/Footer/branding/WhatsApp) -- no hay un
 *   subconjunto más chico que lo cubra. `branding` además se lee en
 *   app/icon.tsx y app/apple-icon.tsx (favicon) -- ambos cuelgan del
 *   layout raíz, así que "/","layout" (lo que ya usa "global") los cubre
 *   igual, sin necesitar una entrada aparte.
 * - "paths": rutas públicas puntuales que lo leen.
 * - "allProductPages": además de `paths`, se lee en CADA ficha de
 *   producto -- se invalida con el patrón de segmento dinámico de Next en
 *   vez de enumerar los ~140 slugs uno por uno.
 * - sin páginas y sin "allProductPages" (saleStatusColors): no se lee en
 *   ninguna ruta pública -- es solo un color de UI del propio panel admin.
 */
const SETTINGS_REVALIDATION: Record<SiteSettingsKey, SettingsRevalidationRule> = {
  navbar: { global: true },
  footer: { global: true },
  branding: { global: true },
  wholesale: { global: true },
  hero: { paths: ["/"] },
  home: { paths: ["/"] },
  valueProps: { paths: ["/"] },
  reviews: { paths: ["/"] },
  dtf: { paths: ["/"] },
  personalizationGallery: { paths: ["/personalizacion"] },
  customBanner: { paths: ["/", "/personalizacion"], allProductPages: true },
  productNotices: { paths: [], allProductPages: true },
  productInfo: { paths: [], allProductPages: true },
  saleStatusColors: { paths: [] },
};

/**
 * Chequeo de forma genérico contra el valor por defecto de cada ajuste: no
 * valida reglas de negocio por campo (para eso ya está cada *SettingsForm*
 * del admin), pero sí evita que un body con la forma totalmente equivocada
 * (un string suelto, un array en vez de objeto, un campo faltante o de otro
 * tipo) se guarde tal cual en site_settings y rompa el render de esa
 * sección en la tienda hasta corregirlo a mano.
 */
function matchesShape(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) return Array.isArray(value);
  if (template !== null && typeof template === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const tmpl = template as Record<string, unknown>;
    const val = value as Record<string, unknown>;
    return Object.keys(tmpl).every((k) => matchesShape(val[k], tmpl[k]));
  }
  return typeof value === typeof template;
}

type Params = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { key } = await params;
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "Configuración desconocida." }, { status: 404 });
  }
  const value = await getSetting(key, DEFAULTS[key]);
  return NextResponse.json(value);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { key } = await params;
  if (!isValidKey(key)) {
    return NextResponse.json({ error: "Configuración desconocida." }, { status: 404 });
  }
  try {
    const body = await request.json();
    if (!matchesShape(body, DEFAULTS[key])) {
      return NextResponse.json(
        { error: "La configuración enviada no tiene la forma esperada." },
        { status: 400 },
      );
    }
    await updateSetting(key, body);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 },
    );
  }

  await revalidateAfterWrite(`guardar configuración "${key}"`, async () =>
    safeRevalidatePaths(settingsRevalidationEntries(SETTINGS_REVALIDATION[key])),
  );

  return NextResponse.json({ ok: true });
}
