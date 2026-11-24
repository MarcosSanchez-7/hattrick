import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions";
import { getPublicProductsBySlugs } from "@/lib/data";
import { checkCartResolveRateLimit } from "@/lib/rate-limit";
import { parseSlugsParam } from "@/lib/cart-resolve";

/**
 * Resolución pública de productos por slug -- para que CartProvider.tsx
 * reconstruya un carrito guardado en localStorage sin depender de recibir
 * el catálogo completo desde app/(store)/layout.tsx (ver Fase 3B).
 *
 * GET, no POST: es una lectura pura sin efectos secundarios, y la cadena
 * de slugs como query param (en vez de un body) permite que el mismo
 * conjunto de productos arme siempre la misma URL (ver
 * buildCartItemsUrl en lib/cart-resolve.ts, que ordena antes de armarla) y
 * sea cacheable por el borde de Vercel -- varios carritos distintos con los
 * mismos productos populares no le pegan a Supabase cada uno por su cuenta
 * dentro de la misma ventana corta de caché.
 *
 * Cache-Control: `s-maxage=30` (CDN) pero `max-age=0` (navegador siempre
 * revalida) -- el precio/stock puede cambiar en cualquier momento desde el
 * admin. 30s absorbe ráfagas sin servir datos demasiado viejos; quien
 * necesite la certeza más fresca posible (el paso previo a continuar por
 * WhatsApp, ver CarritoView.tsx) pide con `cache: "no-store"` del lado del
 * cliente para saltarse esto a propósito.
 *
 * La propia reconstrucción del carrito NUNCA debe confiar en precio/stock
 * guardados en localStorage como fuente de verdad -- esos solo persisten
 * slug/talla/cantidad/personalización (ver StoredLine en CartProvider.tsx);
 * el precio/stock mostrados siempre vienen de esta ruta (o de los datos ya
 * frescos de ProductDetail/QuickAddButton al agregar).
 */
// Cualquier respuesta de error (429/400/500) lleva esta cabecera a
// propósito -- encontrado durante la verificación de la Fase 3B: sin un
// Cache-Control explícito, un proxy/CDN intermedio mal configurado podría
// decidir cachear igual una respuesta no-200 (algunos lo hacen por
// defecto), dejando a otros clientes recibiendo el mismo error (p. ej. un
// 500 transitorio de Supabase) por el resto de esa ventana de caché. Nunca
// debe cachearse un error de esta ruta.
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs") ?? "";

  // PENDIENTE DE PORTABILIDAD (Netlify): `ipAddress()` de "@vercel/functions"
  // lee las cabeceras que la EDGE NETWORK DE VERCEL agrega de forma
  // confiable (no falsificables por el cliente) -- mismo paquete/patrón que
  // ya usa proxy.ts para el rate limiting del panel admin. Si este proyecto
  // alguna vez se despliega en Netlify (u otro host), esta llamada deja de
  // funcionar tal cual: Netlify no expone ese mismo paquete, y su
  // equivalente de confianza es la cabecera `x-nf-client-connection-ip`
  // (o `context.ip` dentro de una Netlify Function) -- habría que
  // reemplazar este import por una lectura específica de esa cabecera (y
  // volver a auditar que efectivamente no sea falsificable en ese entorno)
  // antes de migrar. No se resuelve acá -- documentado a pedido explícito
  // del cierre de la Fase 3B, sin introducir una abstracción multi-host
  // todavía no necesaria mientras el despliegue siga siendo Vercel.
  const ip = ipAddress(request);
  if (ip) {
    const { limited, retryAfterSeconds } = await checkCartResolveRateLimit(ip);
    if (limited) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes, esperá un momento." },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
          },
        },
      );
    }
  }

  const parsed = parseSlugsParam(raw);
  if (!parsed.ok) {
    const message =
      parsed.error === "too_long"
        ? "La consulta es demasiado larga."
        : "Se pidieron demasiados productos a la vez.";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (parsed.slugs.length === 0) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await getPublicProductsBySlugs(parsed.slugs);
    // La verificación de vigencia previa a WhatsApp (refreshPrices en
    // CartProvider.tsx) agrega "_fresh" a la URL para que ningún CDN/proxy
    // intermedio tenga una entrada previa que servir (ver buildCartItemsUrl
    // en lib/cart-resolve.ts) -- la propia RESPUESTA también lo deja
    // explícito con no-store, en vez de confiar únicamente en que la URL
    // nunca se repita. El resto de las resoluciones (restaurar el carrito,
    // la de fondo) conservan la política cacheable habitual sin cambios.
    const isFreshnessCheck = request.nextUrl.searchParams.has("_fresh");
    return NextResponse.json(
      { products },
      {
        headers: isFreshnessCheck
          ? NO_STORE_HEADERS
          : { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" },
      },
    );
  } catch (err) {
    console.error("Error resolviendo productos del carrito:", err);
    return NextResponse.json(
      { error: "No se pudieron resolver los productos del carrito." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
