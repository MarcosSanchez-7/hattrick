# Arquitectura reportada

Navegador → Cloudflare (configuración por verificar a nivel de infraestructura; no confirmable leyendo el código de este repositorio) → Next.js/hosting → Supabase. Imágenes de Vercel Blob servidas directamente al navegador según auditoría previa. App Router con páginas ISR y rutas dinámicas; `React.cache()` por contexto de render (dedupe dentro de una misma ejecución de página/ruta, no entre páginas distintas ni caché persistente global). Carrito y favoritos resuelven slugs por API dedicada (`/api/catalog/cart-items`); buscador-overlay usa una API especializada (`/api/catalog/search`); la página `/buscar` (distinta de esa API) aún recupera el catálogo completo para alimentar el mismo `ProductBrowser`/`ProductCard` que el resto de los listados. Checkout revalida precio/stock en el momento, no reserva inventario.

TTL de ISR (segundos), **verificados contra el código real durante esta auditoría** (`export const revalidate` en cada archivo):

| Ruta | TTL |
|---|---|
| `layout.tsx` (toda página pública) | 86400 |
| `/` (inicio) | 900 |
| `/producto/[slug]` | 900 |
| `/categoria/[...slug]` | 900 |
| `/novedades` | 900 |
| `/ofertas` | 300 |
| `/mayorista` | 3600 |
| `/personalizacion` | 3600 |
| `/pagina/[slug]` (info) | 86400 |
| `/sitemap.xml` | 3600 |

ISR vencido requiere una solicitud posterior al vencimiento y una regeneración exitosa; no garantiza una actualización puntual en el instante exacto del vencimiento. Invalidaciones administrativas selectivas en la mayoría de los casos, algunas globales cuando el cambio afecta contenido compartido (navbar, footer, nombre de categoría). El sitemap no tiene invalidación directa — depende exclusivamente de su TTL de 3600s o de una build nueva. `ProductCard` y `Footer` tienen `prefetch={false}` en sus enlaces desde la Fase 6B; el resto del storefront usa el prefetch automático por defecto de `next/link`.

Cuello de botella de escalabilidad pendiente (confirmado en la Fase 7A, no resuelto todavía): cada página estática de producto/categoría re-pide el catálogo completo (con sus relaciones por lotes de 20) de forma independiente — el costo crece de forma compatible con cuadrática en el número de productos, no se confirmó un N+1 clásico por producto individual. Verificar siempre las funciones reales y sus contratos de datos en `lib/data.ts` antes de proponer un cambio, en vez de asumir el comportamiento desde este resumen.
