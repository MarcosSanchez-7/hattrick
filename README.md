# HATTRICK

Tienda de camisetas de fútbol construida con Next.js (App Router) y Supabase (Postgres + Storage). Hosteada en Netlify.

## Stack

- **Next.js 16** (Turbopack) + React 19 + TypeScript
- **Supabase**: Postgres (catálogo de productos y categorías) + Storage (fotos subidas desde el panel, bucket `product-images`)
- **Netlify** (`@netlify/plugin-nextjs`): hosting y deploys
- CSS propio (sin librería de UI), diseño en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

## Estructura

- `app/(store)/` — tienda pública: home, categorías, ficha de producto, buscador, carrito
- `app/admin/` — panel de administración (sin autenticación todavía): productos y categorías
- `app/api/admin/` — rutas usadas por el panel (CRUD + subida de imágenes a Supabase Storage)
- `lib/data.ts` — única capa que habla con Supabase; el resto de la app no importa el cliente directamente
- `supabase/schema.sql` — esquema de las tablas `products` y `categories`
- `data/*.json` — catálogo de partida, usado solo por `scripts/migrate-to-supabase.mjs`

## Desarrollo local

1. Copia `.env.example` a `.env.local` y rellena las claves de tu proyecto de Supabase (Project Settings → API): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
2. Ejecuta el contenido de `supabase/schema.sql` una vez en el SQL Editor de Supabase (ya incluye la creación del bucket `product-images`).
3. `npm install`
4. `npm run dev`

En Netlify, cargá las mismas variables de `.env.example` en Site settings → Environment variables (ya no hace falta `BLOB_READ_WRITE_TOKEN`).

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run migrate:supabase` — vuelca `data/*.json` en las tablas de Supabase (solo hace falta una vez, al arrancar un proyecto nuevo)
