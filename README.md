# HATTRICK

Tienda de camisetas de fútbol (Paraguay, `www.hattrickpy.com`) construida con Next.js (App Router), Supabase y Vercel Blob.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Supabase**: Postgres + PostgREST — catálogo, categorías, ventas, inventario, configuración del sitio y más de 20 tablas (ver `supabase/schema.sql`)
- **Vercel Blob**: fotos subidas desde el panel de administración
- CSS propio (sin librería de UI), diseño en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

## Estructura

- `app/(store)/` — tienda pública: home, categorías, ficha de producto, novedades, ofertas, mayorista, personalización, páginas informativas, buscador, carrito, favoritos
- `app/gestion-ssjblue/` — panel de administración **con autenticación** (sesión por cookie JWT firmada): `login/`, `setup/` (alta del primer admin) y `(protected)/` (productos, categorías, ventas, inventario, finanzas, configuración general)
- `app/api/admin/` — rutas usadas por el panel (CRUD, login, subida de imágenes a Vercel Blob) — todas detrás de la misma sesión que `/gestion-ssjblue`
- `app/api/catalog/` — endpoints públicos livianos para carrito (`cart-items`) y buscador (`search`), con su propia proyección de datos
- `lib/data.ts` — única capa que habla con Supabase; el resto de la app no importa el cliente directamente
- `supabase/schema.sql` — esquema completo (productos, variantes, categorías, parches, proveedores, ventas, inventario, configuración del sitio, cuentas de clientes, etc.)
- `data/*.json` — catálogo de partida histórico, usado solo por `scripts/migrate-to-supabase.mjs` (migración única, no se usa en desarrollo normal)

## Entorno de pruebas aislado (local, no toca producción)

Además de `npm run dev` (que usa `.env.local`, apuntado al proyecto de Supabase real), existe un entorno de pruebas **completamente aislado** contra una instancia de Supabase local (Docker), nunca contra producción:

```
npm run supabase:start       # levanta Supabase local (API 127.0.0.1:54321, DB 54322, Studio 54323)
npm run test:env:generate    # genera .env.test.local a partir de ese stack local (nunca copia .env.local)
npm run build:test           # build de Next contra ese entorno, distDir separado (.next-test)
npm run start:test           # sirve ese build en el puerto 3100
npm run dev:test             # equivalente de "next dev" dentro del mismo entorno aislado
npm run supabase:reset       # reset del contenido de la base LOCAL (destructivo, solo local)
```

Un guard obligatorio (`scripts/test-env.mjs`) verifica que estas variables de entorno correspondan de verdad al stack local antes de permitir cualquier escritura — ver `docs/agents/TESTING.md` para el detalle completo y `docs/agents/SECURITY.md` para las restricciones de seguridad.

## Desarrollo local (contra Supabase real)

1. Copia `.env.example` a `.env.local` y rellena las claves de tu proyecto de Supabase (Project Settings → API).
2. Ejecuta el contenido de `supabase/schema.sql` una vez en el SQL Editor de Supabase.
3. Crea un Blob store en Vercel (proyecto → Storage → Create → Blob) y copia `BLOB_READ_WRITE_TOKEN` a `.env.local`.
4. `npm install`
5. `npm run dev`

Para desarrollar o probar sin tocar datos reales, usar el entorno aislado de la sección anterior en vez de este.

## Scripts

- `npm run dev` / `npm run build` / `npm run start` — contra `.env.local` (Supabase real)
- `npm test` — 149 pruebas unitarias (`node --test lib/*.test.ts`)
- `npm run lint`
- `npm run migrate:supabase` — vuelca `data/*.json` en las tablas de Supabase (uso único, al arrancar un proyecto nuevo)
- Ver la sección anterior para los scripts del entorno de pruebas aislado

## Documentación para agentes de IA

Si estás trabajando en este repositorio como agente (Claude Code, Codex u otro): lee `AGENTS.md` primero (y `CLAUDE.md` además, si sos Claude Code). El contexto detallado del proyecto, la arquitectura reportada, las mediciones históricas, el estado de los checkpoints y el protocolo de coordinación entre agentes viven en `docs/agents/`.
