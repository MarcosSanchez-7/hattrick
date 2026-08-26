import { NextRequest, NextResponse } from "next/server";
import { DataError, getSetting, updateSetting } from "@/lib/data";
import {
  DEFAULT_BRANDING,
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_FOOTER,
  DEFAULT_HERO,
  DEFAULT_HOME,
  DEFAULT_NAVBAR,
  DEFAULT_PERSONALIZATION_GALLERY,
  DEFAULT_PRODUCT_INFO,
  DEFAULT_PRODUCT_NOTICES,
  DEFAULT_REVIEWS,
  DEFAULT_VALUE_PROPS,
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
};

function isValidKey(key: string): key is SiteSettingsKey {
  return key in DEFAULTS;
}

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
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 },
    );
  }
}
