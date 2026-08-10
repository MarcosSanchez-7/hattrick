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

-- Nota: las fotos subidas desde el panel NO viven en Supabase Storage.
-- Se guardan en Vercel Blob (ver app/api/admin/upload/route.ts) para no
-- consumir la cuota de almacenamiento de Supabase.

-- ═══════════════════════════════════════════════════════════════════════════
-- Inventario y ventas — cimientos para las futuras secciones de Stock y
-- Ventas diarias. Todavía NO están conectadas a la app (products.sizes y
-- products.sold_out se siguen usando tal cual); esto solo deja la base lista.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Variantes de producto (talla) y stock ────────────────────────────────
create table if not exists product_variants (
  id text primary key,
  product_id text not null references products (id) on delete cascade,
  size text not null,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size)
);

alter table product_variants enable row level security;

create index if not exists product_variants_product_idx on product_variants (product_id);

drop trigger if exists product_variants_set_updated_at on product_variants;
create trigger product_variants_set_updated_at
  before update on product_variants
  for each row
  execute function set_updated_at();

-- ── Ventas (encabezado) ───────────────────────────────────────────────────
create table if not exists sales (
  id text primary key,
  channel text not null check (channel in ('store', 'web')),
  staff_name text,
  customer_note text,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table sales enable row level security;

create index if not exists sales_sold_at_idx on sales (sold_at);
create index if not exists sales_channel_idx on sales (channel);

-- ── Líneas de venta ("qué se vendió") ─────────────────────────────────────
create table if not exists sale_items (
  id bigint generated always as identity primary key,
  sale_id text not null references sales (id) on delete cascade,
  variant_id text not null references product_variants (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

alter table sale_items enable row level security;

create index if not exists sale_items_sale_idx on sale_items (sale_id);
create index if not exists sale_items_variant_idx on sale_items (variant_id);

-- ── Movimientos de inventario ("cómo se movió el stock") ──────────────────
create table if not exists inventory_movements (
  id bigint generated always as identity primary key,
  variant_id text not null references product_variants (id) on delete restrict,
  movement_type text not null check (
    movement_type in ('restock', 'sale_in_store', 'sale_online', 'correction', 'return')
  ),
  quantity_delta integer not null check (quantity_delta <> 0),
  sale_item_id bigint references sale_items (id) on delete set null,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  check (
    (movement_type in ('restock', 'return') and quantity_delta > 0)
    or (movement_type in ('sale_in_store', 'sale_online') and quantity_delta < 0)
    or (movement_type = 'correction')
  )
);

alter table inventory_movements enable row level security;

create index if not exists inventory_movements_variant_idx
  on inventory_movements (variant_id, created_at desc);
create index if not exists inventory_movements_created_at_idx
  on inventory_movements (created_at desc);
create index if not exists inventory_movements_sale_item_idx
  on inventory_movements (sale_item_id);

-- Mantiene product_variants.stock_on_hand sincronizado con el ledger.
create or replace function apply_inventory_movement()
returns trigger as $$
begin
  update product_variants
  set stock_on_hand = stock_on_hand + new.quantity_delta
  where id = new.variant_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists inventory_movements_apply on inventory_movements;
create trigger inventory_movements_apply
  after insert on inventory_movements
  for each row
  execute function apply_inventory_movement();

-- Genera el movimiento de salida de stock al registrar una línea de venta
-- (física u online — mismo camino, sólo cambia sales.channel).
create or replace function create_sale_inventory_movement()
returns trigger as $$
declare
  v_channel text;
begin
  select channel into v_channel from sales where id = new.sale_id;
  insert into inventory_movements (variant_id, movement_type, quantity_delta, sale_item_id)
  values (
    new.variant_id,
    case when v_channel = 'web' then 'sale_online' else 'sale_in_store' end,
    -new.quantity,
    new.id
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists sale_items_create_movement on sale_items;
create trigger sale_items_create_movement
  after insert on sale_items
  for each row
  execute function create_sale_inventory_movement();

-- RPC atómico: registra una venta (encabezado + líneas) en una sola
-- transacción, para que un fallo a mitad de camino no deje stock a medio
-- descontar. Uso futuro desde lib/data.ts: supabaseAdmin.rpc('record_sale', {...}).
-- El mismo camino sirve tanto para una venta física como para un futuro
-- checkout web (solo cambia p_channel).
create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb -- [{ "variant_id": "...", "quantity": 1, "unit_price": 350000 }, ...]
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (id, channel, staff_name, customer_note)
  values (p_id, p_channel, p_staff_name, p_customer_note);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (sale_id, variant_id, quantity, unit_price)
    values (
      p_id,
      v_item->>'variant_id',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric
    );
  end loop;

  return p_id;
end;
$$;

-- ── Tipo de stock por producto ─────────────────────────────────────────────
-- propio: cantidad real cargada por talla (product_variants). ajeno/importado:
-- no llevamos cantidad; el storefront muestra "Consultar talle".
alter table products
  add column if not exists stock_mode text not null default 'propio'
  check (stock_mode in ('propio', 'ajeno', 'importado'));

-- ═══════════════════════════════════════════════════════════════════════════
-- Pantalla de Ventas diarias — precio de costo (para calcular ganancia) y
-- más canales de venta además de tienda física / web.
-- ═══════════════════════════════════════════════════════════════════════════

-- Costo del producto (opcional): se precarga al registrar una venta para no
-- tener que escribirlo a mano cada vez. Un solo costo por producto, no por talla.
alter table products add column if not exists cost_price numeric(10, 2);

-- Costo real aplicado en esa línea de venta (copiado del producto al momento
-- de vender, editable; así la ganancia histórica no cambia si el costo
-- del producto se actualiza después).
alter table sale_items
  add column if not exists cost_price numeric(10, 2) not null default 0;

-- Amplía los canales permitidos.
alter table sales drop constraint if exists sales_channel_check;
alter table sales
  add constraint sales_channel_check
  check (channel in ('store', 'whatsapp', 'instagram', 'web'));

-- record_sale ahora también guarda el costo de cada línea.
create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb -- [{ "variant_id": "...", "quantity": 1, "unit_price": 350000, "cost_price": 200000 }, ...]
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (id, channel, staff_name, customer_note)
  values (p_id, p_channel, p_staff_name, p_customer_note);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (sale_id, variant_id, quantity, unit_price, cost_price)
    values (
      p_id,
      v_item->>'variant_id',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0)
    );
  end loop;

  return p_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Configuración general del sitio (Hero, Footer, Navbar) — /admin/generales.
-- Clave -> jsonb en vez de columnas fijas: así se pueden añadir más ajustes
-- (más secciones "Generales") sin migraciones nuevas cada vez.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

drop trigger if exists site_settings_set_updated_at on site_settings;
create trigger site_settings_set_updated_at
  before update on site_settings
  for each row
  execute function set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- Ocultar productos/categorías sin borrarlos — alternativa a eliminar cuando
-- un producto ya tiene ventas o movimientos de stock (por eso no se puede
-- borrar: perdería el historial). Al ocultar una categoría, sus productos
-- también dejan de verse en toda la tienda, no solo en el menú.
-- ═══════════════════════════════════════════════════════════════════════════

alter table products add column if not exists is_visible boolean not null default true;
alter table categories add column if not exists is_visible boolean not null default true;

create index if not exists products_is_visible_idx on products (is_visible);
create index if not exists categories_is_visible_idx on categories (is_visible);

-- ═══════════════════════════════════════════════════════════════════════════
-- Cuentas de clientes (login de la tienda) — separado por completo de
-- /admin, que sigue sin autenticación. Se apoya en Supabase Auth (auth.users,
-- que Supabase gestiona internamente y no tocamos directo) y añade un perfil
-- 1:1 en public.customers.
--
-- A diferencia de las demás tablas de este archivo, aquí SÍ hay políticas de
-- RLS reales: el navegador puede leer/actualizar esta tabla directamente (a
-- través de la sesión de Supabase Auth del propio cliente), pero cada
-- usuario autenticado solo puede ver y modificar SU PROPIA fila. El panel
-- /admin sigue usando exclusivamente supabaseAdmin (service_role), que
-- ignora RLS siempre, así que esta tabla no le afecta en nada.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists customers (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers enable row level security;

drop policy if exists "customers_select_own" on customers;
create policy "customers_select_own"
  on customers for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "customers_update_own" on customers;
create policy "customers_update_own"
  on customers for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sin políticas de insert/delete para "authenticated": la fila la crea
-- únicamente el trigger de abajo (con SECURITY DEFINER, que salta RLS).

drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at
  before update on customers
  for each row
  execute function set_updated_at(); -- ya definida arriba en este archivo

-- Crea automáticamente la fila de perfil cuando Supabase Auth registra un
-- usuario nuevo (en el signUp, incluso antes de confirmar el email).
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_customer();

-- ═══════════════════════════════════════════════════════════════════════════
-- Simplificación de la ficha de producto: se retiran "equipo/marca", "liga"
-- y "temporada" como campos aparte — demasiado detalle para la carga real.
-- "Equipo" se fusiona dentro de "nombre" (antes eran dos líneas separadas en
-- las tarjetas/ficha; ahora es un solo título) para no perder el dato ya
-- cargado en los productos existentes. El bloque "if exists" hace que sea
-- seguro volver a correr este archivo completo aunque las columnas ya se
-- hayan borrado antes.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'products' and column_name = 'team'
  ) then
    update products
    set name = team || ' — ' || name
    where coalesce(team, '') <> '';
  end if;
end $$;

alter table products drop column if exists team;
alter table products drop column if exists league;
alter table products drop column if exists season;

-- ═══════════════════════════════════════════════════════════════════════════
-- Permite borrar un producto aunque tenga ventas o movimientos de stock
-- registrados. Antes "on delete restrict" lo bloqueaba por completo (la
-- única salida era ocultarlo). Se cambia a "on delete set null": al borrar
-- el producto (y en cascada sus tallas), las líneas de venta e inventario
-- YA REGISTRADAS se conservan intactas (importe, costo, cantidad, fecha —
-- todo lo que alimenta los totales de Ventas), solo pierden la referencia a
-- qué talla/producto exacto era. Por eso variant_id pasa a admitir null.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'sale_items'::regclass
    and confrelid = 'product_variants'::regclass
    and contype = 'f';
  if fk_name is not null then
    execute format('alter table sale_items drop constraint %I', fk_name);
  end if;
end $$;

alter table sale_items alter column variant_id drop not null;

alter table sale_items
  add constraint sale_items_variant_id_fkey
  foreign key (variant_id) references product_variants (id) on delete set null;

do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'inventory_movements'::regclass
    and confrelid = 'product_variants'::regclass
    and contype = 'f';
  if fk_name is not null then
    execute format('alter table inventory_movements drop constraint %I', fk_name);
  end if;
end $$;

alter table inventory_movements alter column variant_id drop not null;

alter table inventory_movements
  add constraint inventory_movements_variant_id_fkey
  foreign key (variant_id) references product_variants (id) on delete set null;
