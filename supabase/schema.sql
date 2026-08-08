-- HATTRICK — esquema inicial de Supabase.
-- Ejecutar una sola vez en: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Diseño de seguridad: RLS activado y SIN políticas en ambas tablas.
-- Eso bloquea el acceso a los roles "anon" y "authenticated" por completo;
-- solo la service_role key (usada exclusivamente en el servidor, en las
-- rutas /api/admin/*) puede leer o escribir, porque service_role salta
-- siempre las políticas de RLS. Coincide con el diseño actual: el navegador
-- nunca habla directamente con Supabase, todo pasa por nuestro servidor.

create table if not exists categories (
  slug text primary key,
  name text not null,
  tagline text not null,
  description text not null,
  image text,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

create table if not exists products (
  id text primary key,
  slug text not null unique,
  team text not null,
  name text not null,
  category text not null references categories (slug) on update cascade,
  league text not null,
  season text not null,
  price numeric(10, 2) not null check (price > 0),
  compare_at numeric(10, 2),
  is_new boolean not null default false,
  rating numeric(2, 1) not null default 5,
  reviews integer not null default 0,
  sizes text[] not null default '{}',
  sold_out text[] not null default '{}',
  color_primary text not null,
  color_secondary text not null,
  color_accent text not null,
  pattern text not null check (pattern in ('solid', 'stripes', 'hoops', 'halves', 'sash')),
  description text not null,
  tags text[] not null default '{}',
  images text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products enable row level security;

create index if not exists products_category_idx on products (category);
create index if not exists products_league_idx on products (league);

-- Mantiene updated_at al día en cada UPDATE.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row
  execute function set_updated_at();

-- Bucket de Storage para las fotos subidas desde el panel.
-- Público de lectura (las imágenes de producto no son sensibles); la subida
-- solo la hace nuestro servidor con la service_role key.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
