import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions";
import { newArrivals, searchProducts } from "@/lib/catalog";
import { getSearchableCatalog } from "@/lib/data";
import { checkSearchRateLimit } from "@/lib/rate-limit";
import { parseSearchParams } from "@/lib/search-core";

/**
 * Búsqueda pública bajo demanda -- para que SearchOverlay.tsx (barra rápida
 * del header) ya no reciba el catálogo completo vía props desde
 * app/(store)/layout.tsx (ver Fase 3C). Mismo patrón que
 * app/api/catalog/cart-items/route.ts (Fase 3B): GET, slugs/términos como
 * query param, rate limit reusado, Cache-Control explícito.
 *
 * Reusa searchProducts()/newArrivals() de lib/catalog.ts SIN modificarlos
 * -- es el mismo algoritmo que ya usaba el buscador (sustring AND sobre
 * nombre/categoría/etiquetas, orden por reviews descendente, "novedades"
 * para sugerencias iniciales). Correrlo acá en vez de mandar el catálogo
 * entero al navegador para que el cliente lo corra ahí es la única
 * diferencia real -- la calidad/orden de los resultados es exactamente la
 * misma (ver lib/catalog.test.ts, que prueba esa función directamente).
 *
 * `q` vacío devuelve "sugerencias" (newArrivals) -- mismo criterio que
 * SearchOverlay.tsx mostraba antes con el campo vacío, ahora resuelto acá.
 *
 * Cache-Control: igual política que cart-items (s-maxage=30, max-age=0) --
 * NO se promete consistencia inmediata tras un cambio administrativo de
 * precio/stock/visibilidad/categoría/etiqueta. Y el desfase real tampoco
 * queda acotado en 30s: SearchOverlay.tsx guarda la respuesta en una caché
 * propia del cliente por 60s más ENCIMA de esto (ver CLIENT_CACHE_TTL_MS
 * ahí) -- peor caso combinado, hasta ~90s entre que se guarda un cambio y
 * que el último cliente con esa búsqueda en su caché local lo ve. Ningún
 * caso de uso de la búsqueda (sugerir productos, no comprar) necesita más
 * que eso -- a diferencia de cart-items, acá no existe un equivalente al
 * "_fresh" de refreshPrices porque no hay ningún paso de checkout que
 * dependa de un resultado de búsqueda.
 */
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  // PENDIENTE DE PORTABILIDAD (Netlify): mismo caveat ya documentado en
  // app/api/catalog/cart-items/route.ts -- `ipAddress()` de
  // "@vercel/functions" no tiene equivalente directo fuera de Vercel.
  const ip = ipAddress(request);
  if (ip) {
    const { limited, retryAfterSeconds } = await checkSearchRateLimit(ip);
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

  const parsed = parseSearchParams(
    request.nextUrl.searchParams.get("q"),
    request.nextUrl.searchParams.get("limit"),
  );
  if (!parsed.ok) {
    const message =
      parsed.error === "query_too_long"
        ? "La búsqueda es demasiado larga."
        : "Parámetro de límite inválido.";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const catalog = await getSearchableCatalog();
    const products = parsed.query
      ? searchProducts(catalog, parsed.query).slice(0, parsed.limit)
      : newArrivals(catalog).slice(0, parsed.limit);

    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" } },
    );
  } catch (err) {
    console.error("Error resolviendo la búsqueda:", err);
    return NextResponse.json(
      { error: "No se pudo completar la búsqueda." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
