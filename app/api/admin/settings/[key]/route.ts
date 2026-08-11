import { NextRequest, NextResponse } from "next/server";
import { DataError, getSetting, updateSetting } from "@/lib/data";
import {
  DEFAULT_CUSTOM_BANNER,
  DEFAULT_FOOTER,
  DEFAULT_HERO,
  DEFAULT_HOME,
  DEFAULT_NAVBAR,
  DEFAULT_PRODUCT_NOTICES,
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
  valueProps: DEFAULT_VALUE_PROPS,
};

function isValidKey(key: string): key is SiteSettingsKey {
  return key in DEFAULTS;
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
