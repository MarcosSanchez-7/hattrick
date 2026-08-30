import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/data";
import { isOnSale, isSoldOut } from "@/lib/catalog";
import { SITE_URL, SITE_NAME } from "@/lib/site";

/**
 * Feed de catálogo para Meta Commerce Manager (Facebook/Instagram/WhatsApp
 * Shop) — formato RSS 2.0 + namespace de Google Shopping (el mismo que
 * acepta Meta, así que este mismo feed serviría también para Google
 * Merchant Center si hiciera falta más adelante).
 *
 * La URL se protege con un token en vez de dejarla del todo abierta — el
 * catálogo no es sensible (es la misma info pública de la tienda), pero
 * evita que cualquier bot genérico la encuentre y la scrapee entera.
 */

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Precio en Gs. (como se guarda en la base) -> string en el formato que
 * exige Meta: "número espacio CÓDIGO_ISO_4217", sin símbolo, punto decimal. */
function formatFeedPrice(priceGs: number): string {
  const currency = process.env.META_FEED_CURRENCY || "PYG";
  if (currency === "PYG") return `${Math.round(priceGs)} PYG`;

  const rate = Number(process.env.META_FEED_EXCHANGE_RATE);
  if (!rate || !Number.isFinite(rate)) {
    // Sin tasa de cambio configurada no hay forma segura de convertir —
    // mejor mandar Gs. igual que dejar un precio mal calculado.
    return `${Math.round(priceGs)} PYG`;
  }
  return `${(priceGs / rate).toFixed(2)} ${currency}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const expected = process.env.META_FEED_TOKEN;
  if (!expected || token !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const products = await getAllProducts();

  // Sin fotos reales no hay imagen fetcheable por Meta — la ilustración
  // (JerseyArt) es un SVG generado en el navegador, no un archivo con URL.
  // Meta exige image_link, así que estos productos quedan afuera del feed.
  const withPhotos = products.filter((p) => (p.images?.length ?? 0) > 0);

  const items = withPhotos
    .map((p) => {
      const images = p.images!;
      const link = `${SITE_URL}/producto/${p.slug}`;
      const onSale = isOnSale(p);
      const regularPrice = onSale ? p.compareAt! : p.price;
      const additional = images.slice(1, 21); // tope de Meta: 20 extra

      return [
        "<item>",
        `<g:id>${escapeXml(p.id)}</g:id>`,
        `<g:title>${escapeXml(p.name)}</g:title>`,
        `<g:description>${escapeXml(p.description || p.name)}</g:description>`,
        `<g:link>${escapeXml(link)}</g:link>`,
        `<g:image_link>${escapeXml(images[0])}</g:image_link>`,
        additional.length > 0
          ? `<g:additional_image_link>${escapeXml(additional.join(","))}</g:additional_image_link>`
          : "",
        `<g:availability>${isSoldOut(p) ? "out of stock" : "in stock"}</g:availability>`,
        "<g:condition>new</g:condition>",
        `<g:price>${formatFeedPrice(regularPrice)}</g:price>`,
        onSale ? `<g:sale_price>${formatFeedPrice(p.price)}</g:sale_price>` : "",
        `<g:brand>${escapeXml(SITE_NAME)}</g:brand>`,
        "</item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${escapeXml(SITE_NAME)}</title>`,
    `<link>${escapeXml(SITE_URL)}</link>`,
    `<description>Catálogo de productos de ${escapeXml(SITE_NAME)}</description>`,
    items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
