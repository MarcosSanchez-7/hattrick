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

-- ═══════════════════════════════════════════════════════════════════════════
-- Subcategorías anidadas a profundidad arbitraria (ej. Importados → NBA →
-- Lakers). "categories" pasa de ser una lista plana a un árbol simple
-- (adjacency list): cada fila puede apuntar a su categoría padre. Sin
-- "on delete" explícito a propósito (igual estilo que products.category):
-- Postgres rechaza por defecto borrar un padre con hijos, respaldado además
-- por un guard de aplicación con mensaje en español antes de intentarlo.
-- Ninguna categoría existente tiene padre hoy, así que todas quedan como
-- raíz automáticamente — la tienda no cambia de comportamiento hasta que se
-- cree una subcategoría a propósito desde el admin.
-- ═══════════════════════════════════════════════════════════════════════════

alter table categories add column if not exists parent_slug text references categories (slug);

create index if not exists categories_parent_slug_idx on categories (parent_slug);

-- ═══════════════════════════════════════════════════════════════════════════
-- Catálogo de etiquetas estandarizadas (ej. "Versión Fan", "Bajo pedido"),
-- cada una con un color elegido desde el admin. products.tags sigue siendo
-- texto libre (no cambia, no requiere migrar nada): al mostrar una etiqueta
-- se busca su color acá por nombre exacto; si no está en el catálogo (una
-- etiqueta vieja, o borrada después), se muestra igual con el color neutro
-- de siempre — nunca rompe la ficha ni la tarjeta del producto.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists tags (
  name text primary key,
  color text not null default '#2f2f2f',
  created_at timestamptz not null default now()
);

alter table tags enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- Avisos configurables bajo el botón "Añadir al carrito" (ej. "Entrega
-- estimada en 48 h", "Personalización disponible"). Antes eran fijos para
-- todos los productos; ahora cada categoría puede definir los suyos (ej.
-- "Importados" con plazos de entrega distintos). null = usa los avisos por
-- defecto del sitio (configurables en Generales).
-- ═══════════════════════════════════════════════════════════════════════════

alter table categories add column if not exists notices jsonb;

-- ═══════════════════════════════════════════════════════════════════════════
-- Páginas de contenido editables (Términos, Privacidad, Envíos, Contacto,
-- etc.) — antes el footer enlazaba a rutas que no existían. Cada página
-- tiene un lugar fijo en el sitio (placement): "legal" va en la franja
-- inferior del footer, "ayuda" y "empresa" en sus columnas correspondientes.
-- Se pueden crear, editar y borrar libremente desde /admin/paginas; el
-- footer solo muestra las que existen en la tabla.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists pages (
  slug text primary key,
  title text not null,
  body text not null,
  placement text not null check (placement in ('legal', 'ayuda', 'empresa')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table pages enable row level security;

create index if not exists pages_placement_idx on pages (placement);

-- Contenido inicial real (no genérico de relleno), pensado para esta tienda
-- puntual: catálogo informativo, venta cerrada por WhatsApp, sin pasarela de
-- pago propia, envíos a todo Paraguay. Editable después desde el admin.
insert into pages (slug, title, body, placement, sort_order) values
(
  'terminos',
  'Términos y Condiciones',
  E'Estos Términos y Condiciones regulan el uso del sitio web de HATTRICK y la compra de los productos que se ofrecen en él. Al navegar o realizar un pedido, aceptás estas condiciones.\n\nHATTRICK comercializa camisetas de fútbol, oficiales, de importación y personalizadas, en Paraguay. Los precios publicados están expresados en guaraníes (Gs.) e incluyen IVA.\n\nEl sitio web funciona como catálogo: no procesamos pagos en línea. Una vez elegido el producto, la talla y la cantidad, la compra se coordina y se confirma directamente por WhatsApp, donde se define la forma de pago y de entrega.\n\nEl stock, los precios y las promociones pueden cambiar sin previo aviso. Confirmamos disponibilidad real al momento de coordinar tu pedido por WhatsApp.\n\nLos productos personalizados con nombre y dorsal se confeccionan a pedido y no admiten cambio de talla ni devolución, salvo error nuestro en la confección.\n\nPara cambios de talla en productos sin personalizar, aplica la Política de Devoluciones y Cambios publicada en este sitio.\n\nNos reservamos el derecho de no procesar un pedido ante indicios de error, fraude o falta de stock real, informando al cliente por WhatsApp.\n\nCualquier consulta sobre estos términos puede hacerse por WhatsApp o Instagram, según los datos de contacto publicados en el sitio.',
  'legal',
  1
),
(
  'privacidad',
  'Política de Privacidad',
  E'En HATTRICK respetamos tu privacidad. Esta página explica qué datos usamos y para qué.\n\nNo tenemos un sistema de cuentas de usuario. Los datos que guarda el sitio en tu propio navegador (favoritos y carrito de compra) quedan almacenados localmente en tu dispositivo y no se envían a nuestros servidores hasta que decidís continuar la compra por WhatsApp.\n\nCuando coordinás una compra por WhatsApp, nos compartís voluntariamente los datos necesarios para procesarla: nombre, número de teléfono, dirección de entrega y, si corresponde, el nombre y dorsal para personalización. Usamos esos datos únicamente para gestionar tu pedido y comunicarnos con vos sobre él.\n\nNo vendemos ni compartimos tus datos con terceros con fines comerciales.\n\nSi en algún momento querés que eliminemos tus datos de nuestras conversaciones o registros de venta, escribinos por WhatsApp y lo resolvemos.',
  'legal',
  2
),
(
  'cookies',
  'Política de Cookies',
  E'Este sitio no utiliza cookies de terceros con fines publicitarios ni de seguimiento entre páginas.\n\nPara que la tienda funcione, guardamos cierta información técnica directamente en tu navegador (no en cookies tradicionales, sino en almacenamiento local): los productos que agregaste al carrito y los que marcaste como favoritos. Esa información es privada de tu navegador y se borra si limpiás los datos de navegación.\n\nSi en el futuro incorporamos herramientas de estadísticas o publicidad que usen cookies, actualizaremos esta página para explicarlo.',
  'legal',
  3
),
(
  'envios',
  'Envíos y plazos',
  E'Realizamos envíos a todo Paraguay.\n\nLa entrega estándar de productos con stock propio tiene un plazo estimado de 48 horas hábiles desde que se confirma el pedido por WhatsApp. También ofrecemos envío express en 24 horas por un costo adicional.\n\nEl envío es gratuito a partir de Gs. 640.000 en compras con stock propio.\n\nLos productos importados o bajo pedido (por ejemplo, la categoría Importados) tienen un plazo de entrega más largo, que te confirmamos al coordinar la compra según el artículo, generalmente entre 25 y 30 días.\n\nLa forma de envío (moto, encomienda, punto de retiro) se coordina por WhatsApp según tu ubicación.',
  'ayuda',
  1
),
(
  'devoluciones',
  'Devoluciones y cambios',
  E'Si la talla no te queda bien, tenés 30 días desde la entrega para cambiarla, sin costo adicional.\n\nPara que el cambio sea posible, el producto no debe tener uso y debe conservar sus etiquetas originales.\n\nLos productos personalizados con nombre y dorsal no admiten cambio de talla, salvo que el error en la confección haya sido nuestro.\n\nPara iniciar un cambio, escribinos por WhatsApp con tu nombre y el producto: coordinamos el retiro o el punto de entrega según tu zona.',
  'ayuda',
  2
),
(
  'tallas',
  'Guía de tallas',
  E'Nuestras camisetas usan talles P, M, G, XL y XXL, equivalentes a S, M, L, XL y XXL internacional.\n\nComo el corte puede variar un poco según el modelo y el proveedor, si tenés dudas sobre qué talla elegir escribinos por WhatsApp con tu contextura o con las medidas de una remera que ya uses: te ayudamos a elegir la talla correcta antes de confirmar la compra.\n\nRecordá que, si de todas formas la talla no queda bien, tenés 30 días para cambiarla según nuestra Política de Devoluciones y Cambios.',
  'ayuda',
  3
),
(
  'pedido',
  'Seguimiento de pedido',
  E'Como las compras se coordinan y confirman por WhatsApp, no tenemos todavía un sistema de seguimiento online de pedidos.\n\nPara consultar el estado de tu compra, escribinos por WhatsApp con tu nombre y la fecha aproximada del pedido, y te contamos en qué etapa está (preparación, envío o entrega).',
  'ayuda',
  4
),
(
  'contacto',
  'Contacto',
  E'La forma más rápida de contactarnos es por WhatsApp, con el botón flotante que encontrás en cualquier página del sitio.\n\nTambién podés escribirnos por nuestras redes sociales, que encontrás en el pie de página.\n\nNo contamos con local físico de atención al público por el momento: toda la operación es por WhatsApp y envíos a todo el país.',
  'ayuda',
  5
),
(
  'sobre-nosotros',
  'Sobre HATTRICK',
  E'HATTRICK nace de la pasión por el fútbol y por las camisetas que representan a los equipos y selecciones que seguimos. Armamos un catálogo con equipaciones de Europa, Sudamérica, selecciones para el Mundial 2026, ediciones retro y opciones de importación bajo pedido.\n\nTrabajamos con un catálogo organizado por categorías, así es más fácil encontrar la camiseta que buscás según el torneo o la región. Además, ofrecemos un servicio de personalización para sumarle el nombre y el dorsal que quieras a cualquier camiseta del catálogo.\n\nToda la operación es simple y directa: elegís el producto en la web, y cerramos los detalles de la compra por WhatsApp.',
  'empresa',
  1
),
(
  'autenticidad',
  'Autenticidad',
  E'Cada producto de nuestro catálogo indica en su categoría y descripción qué tipo de artículo es: equipaciones de las categorías Europa, Sudamérica y Mundial 2026, ediciones Retro, o productos de la categoría Importados. Así sabés exactamente qué estás comprando antes de confirmar el pedido.\n\nRevisamos la calidad de cada artículo antes de enviarlo. Si al recibirlo encontrás algún defecto de fabricación, escribinos por WhatsApp dentro de los 30 días y lo resolvemos con un cambio.\n\nSi tenés dudas sobre el tipo de tela, el corte o el origen de un modelo puntual, preguntanos por WhatsApp antes de comprar: te contamos con el detalle que necesites.',
  'empresa',
  2
)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Usuarios del panel de administración. Antes /admin no tenía ninguna
-- autenticación a propósito; ahora sí, con roles pensados para escalar:
-- "superadmin" tiene acceso total, y los roles nuevos (editor, viewer) se
-- van habilitando en el mapa de permisos en lib/admin-auth.ts sin necesitar
-- otra migración. La contraseña nunca se guarda en texto plano: se hashea
-- con scrypt (Node nativo) antes de insertarse.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists admin_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'superadmin' check (role in ('superadmin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

create index if not exists admin_users_email_idx on admin_users (lower(email));

-- ═══════════════════════════════════════════════════════════════════════════
-- Importación de ventas históricas desde CSV — /admin/ventas/importar.
-- Las ventas importadas NO se linkean a product_variants (variant_id queda
-- null a propósito): son ventas que ya ocurrieron antes de tener el sistema,
-- así que no deben tocar el stock actual. Sin variant_id no hay de dónde
-- sacar el nombre/talla via join, por eso se guardan como texto plano acá,
-- solo para las líneas importadas (las ventas normales siguen sacando
-- nombre/talla de product_variants → products, estas columnas quedan null).
-- ═══════════════════════════════════════════════════════════════════════════

alter table sale_items add column if not exists product_name_snapshot text;
alter table sale_items add column if not exists size_snapshot text;

-- ═══════════════════════════════════════════════════════════════════════════
-- Administración financiera — /admin/finanzas, exclusivo de superadmin.
-- Todo en guaraníes. Un solo ledger (finance_entries) para ingresos/gastos
-- generales, capital propio aportado/retirado y costos de importación —
-- mismo espíritu que inventory_movements: una tabla de movimientos, no
-- cuatro, para que los totales del dashboard sean un query simple. Las
-- ventas (tabla "sales") NO se duplican acá: el dashboard las suma en vivo
-- y las combina con estos movimientos.
--
-- finance_accounts.balance es un saldo MANUAL (no reconciliado automático
-- contra finance_entries): lo edita el propio dueño cuando cambia. Es una
-- simplificación deliberada — no hay pedido de un motor de reconciliación
-- bancaria, solo "cuánto tengo disponible ahora en tal tarjeta/cuenta".
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists finance_accounts (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('efectivo', 'cuenta_bancaria', 'tarjeta_credito', 'tarjeta_debito')),
  balance numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table finance_accounts enable row level security;

drop trigger if exists finance_accounts_set_updated_at on finance_accounts;
create trigger finance_accounts_set_updated_at
  before update on finance_accounts
  for each row
  execute function set_updated_at();

create table if not exists finance_entries (
  id text primary key,
  type text not null check (type in ('ingreso', 'gasto', 'capital_aporte', 'capital_retiro', 'importacion')),
  category text,
  amount numeric(12, 2) not null check (amount > 0),
  account_id text references finance_accounts (id) on delete set null,
  note text,
  occurred_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

alter table finance_entries enable row level security;

create index if not exists finance_entries_occurred_at_idx on finance_entries (occurred_at desc);
create index if not exists finance_entries_type_idx on finance_entries (type);
create index if not exists finance_entries_account_idx on finance_entries (account_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Compras de mercadería — /admin/finanzas/compras. Registro de cuándo y a
-- qué precio se adquiere stock nuevo, separado de finance_entries porque
-- tiene una forma distinta (producto + cantidad + costo unitario, no un
-- monto suelto). product_name es texto libre a propósito: no toda compra
-- corresponde a un producto ya cargado en el catálogo (puede ser mercadería
-- que todavía no se subió, o un lote de varios artículos).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists merchandise_purchases (
  id text primary key,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  supplier text,
  note text,
  purchased_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

alter table merchandise_purchases enable row level security;

create index if not exists merchandise_purchases_purchased_at_idx
  on merchandise_purchases (purchased_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Gastos fijos/variables — mismo finance_entries (type = 'gasto'), solo se
-- agrega de qué tipo de gasto se trata. Nullable porque solo aplica a
-- gasto: el resto de los tipos (ingreso, capital, importación) lo dejan en
-- null.
-- ═══════════════════════════════════════════════════════════════════════════

alter table finance_entries add column if not exists expense_kind text
  check (expense_kind in ('fijo', 'variable'));

-- ═══════════════════════════════════════════════════════════════════════════
-- Importaciones desde China — /admin/finanzas/importaciones. Registra el
-- costo en dólares (pagado por Paypal), la cotización del dólar de esa
-- operación puntual, el peso del envío y el courier elegido, para calcular
-- el costo real de traer la mercadería: producto (USD * cotización) + flete
-- (kg * costo por kilo del courier) + 10% de impuesto sobre ese subtotal.
-- El cálculo no se guarda — se recalcula siempre desde estos datos crudos
-- (mismo criterio que lineTotal/lineProfit de ventas), así nunca se
-- desincroniza. Igual que merchandise_purchases: es informativo, no genera
-- movimiento de stock ni resta de la utilidad neta (el costo ya queda
-- reflejado en el precio de costo de cada producto al momento de la venta).
--
-- courier_name_snapshot/cost_per_kg_snapshot: por si el courier cambia de
-- tarifa después, o se borra — la compra ya hecha conserva los datos con
-- los que se calculó en su momento.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists import_couriers (
  id text primary key,
  name text not null,
  cost_per_kg numeric(12, 2) not null check (cost_per_kg >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table import_couriers enable row level security;

drop trigger if exists import_couriers_set_updated_at on import_couriers;
create trigger import_couriers_set_updated_at
  before update on import_couriers
  for each row
  execute function set_updated_at();

create table if not exists import_purchases (
  id text primary key,
  product_name text not null,
  cost_usd numeric(12, 2) not null check (cost_usd >= 0),
  exchange_rate numeric(12, 2) not null check (exchange_rate > 0),
  weight_kg numeric(10, 2) not null check (weight_kg > 0),
  courier_id text references import_couriers (id) on delete set null,
  courier_name_snapshot text not null,
  cost_per_kg_snapshot numeric(12, 2) not null,
  tax_rate numeric(5, 2) not null default 10,
  note text,
  purchased_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

alter table import_purchases enable row level security;

create index if not exists import_purchases_purchased_at_idx
  on import_purchases (purchased_at desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Ventas de dropshipping (sin stock propio) + fecha editable al registrar
-- ═══════════════════════════════════════════════════════════════════════════

-- Las líneas de dropshipping no tienen variant_id (no hay stock propio que
-- descontar): sin este guard, el trigger intentaba insertar en
-- inventory_movements con variant_id null, que es NOT NULL ahí — rompía
-- también la importación de CSV histórico, que ya insertaba con variant_id
-- null desde antes.
create or replace function create_sale_inventory_movement()
returns trigger as $$
declare
  v_channel text;
begin
  if new.variant_id is null then
    return new;
  end if;

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

-- record_sale ahora acepta líneas sin variant_id (dropshipping: se guardan
-- con product_name_snapshot/size_snapshot, igual que la importación de CSV)
-- y una fecha de venta opcional (p_sold_at) para poder registrar una venta
-- atrasada sin que quede con la fecha de hoy. Se dropea la versión anterior
-- porque agregar un parámetro nuevo cambia la firma de la función — sin
-- esto quedarían dos versiones de record_sale coexistiendo (ambigüedad al
-- llamarla por RPC).
drop function if exists record_sale(text, text, text, text, jsonb);

create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb, -- [{ "variant_id": "..."|null, "product_name_snapshot": "..."|null, "size_snapshot": "..."|null, "quantity": 1, "unit_price": 350000, "cost_price": 200000 }, ...]
  p_sold_at timestamptz default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (id, channel, staff_name, customer_note, sold_at)
  values (p_id, p_channel, p_staff_name, p_customer_note, coalesce(p_sold_at, now()));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot'
    );
  end loop;

  return p_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Datos de entrega en la venta: cliente, ciudad destino y método de envío —
-- para tener panorama de cómo se mueven los artículos (Bolt, delivery
-- propio, etc.), más allá del canal por el que se vendió.
-- ═══════════════════════════════════════════════════════════════════════════

alter table sales add column if not exists customer_name text;
alter table sales add column if not exists customer_phone text;
alter table sales add column if not exists destination_city text;

alter table sales drop constraint if exists sales_shipping_method_check;
alter table sales add column if not exists shipping_method text;
alter table sales
  add constraint sales_shipping_method_check
  check (shipping_method is null or shipping_method in ('bolt', 'delivery_propio', 'retiro', 'otro'));

-- record_sale ahora también guarda los datos de entrega.
drop function if exists record_sale(text, text, text, text, jsonb, timestamptz);

create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (
    id, channel, staff_name, customer_note, sold_at,
    customer_name, customer_phone, destination_city, shipping_method
  )
  values (
    p_id, p_channel, p_staff_name, p_customer_note, coalesce(p_sold_at, now()),
    p_customer_name, p_customer_phone, p_destination_city, p_shipping_method
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot'
    );
  end loop;

  return p_id;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- Clientes (CRM ligero): entidad propia, para poder ver historial de compras
-- y gasto total por persona en vez de solo texto suelto repetido en cada
-- venta. NO tiene relación con la tabla "customers" de más arriba (esa es
-- de un login de clientes descartado, 1:1 con auth.users) — esta es nueva,
-- de uso exclusivo del admin, por eso el nombre distinto (crm_customers).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists crm_customers (
  id text primary key,
  name text not null,
  phone text,
  -- Solo dígitos, para poder buscar por teléfono sin pelear con espacios,
  -- guiones o el 0/+595 inicial que cada quien escribe distinto.
  phone_normalized text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table crm_customers enable row level security;

create trigger crm_customers_set_updated_at
  before update on crm_customers
  for each row
  execute function set_updated_at();

create index if not exists crm_customers_phone_normalized_idx
  on crm_customers (phone_normalized);

alter table sales add column if not exists customer_id text
  references crm_customers (id) on delete set null;

-- record_sale ahora también guarda el customer_id ya resuelto (find-or-create
-- por teléfono, hecho en lib/data.ts antes de llamar a este RPC).
drop function if exists record_sale(
  text, text, text, text, jsonb, timestamptz, text, text, text, text
);

create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null,
  p_customer_id text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (
    id, channel, staff_name, customer_note, sold_at,
    customer_name, customer_phone, destination_city, shipping_method,
    customer_id
  )
  values (
    p_id, p_channel, p_staff_name, p_customer_note, coalesce(p_sold_at, now()),
    p_customer_name, p_customer_phone, p_destination_city, p_shipping_method,
    p_customer_id
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot'
    );
  end loop;

  return p_id;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- Ventas: producto vinculado en dropshipping (para poder mostrar su imagen),
-- detalle por artículo (personalización, parches, etc.) y aclaración libre
-- cuando el método de envío es "otro".
-- ═══════════════════════════════════════════════════════════════════════════

-- Hasta ahora una línea de dropshipping solo guardaba el nombre como texto
-- (product_name_snapshot), sin ninguna referencia al producto real — aunque
-- sí se elige de la lista del catálogo. Con esto se puede mostrar la foto
-- del producto en Ventas/Clientes sin tener que duplicar la imagen ahí.
alter table sale_items add column if not exists product_id_snapshot text
  references products (id) on delete set null;

-- Detalle libre por artículo: "Personalizado: Messi #10", "Con parches
-- Champions", etc. — para saber después, en la ficha del cliente, qué
-- compró exactamente.
alter table sale_items add column if not exists item_note text;

-- Aclaración cuando el método de envío es "otro" (p.ej. de dónde sale el
-- paquete en un pedido de dropshipping).
alter table sales add column if not exists shipping_method_detail text;

drop function if exists record_sale(
  text, text, text, text, jsonb, timestamptz, text, text, text, text, text
);

create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb, -- suma: product_id_snapshot, item_note
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null,
  p_customer_id text default null,
  p_shipping_method_detail text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (
    id, channel, staff_name, customer_note, sold_at,
    customer_name, customer_phone, destination_city, shipping_method,
    customer_id, shipping_method_detail
  )
  values (
    p_id, p_channel, p_staff_name, p_customer_note, coalesce(p_sold_at, now()),
    p_customer_name, p_customer_phone, p_destination_city, p_shipping_method,
    p_customer_id, p_shipping_method_detail
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot, product_id_snapshot, item_note
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot',
      nullif(v_item->>'product_id_snapshot', ''),
      v_item->>'item_note'
    );
  end loop;

  return p_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Mapa de clientes: barrio (más detalle que la ciudad) y ubicación (lat/lng)
-- marcada a mano en un mapa. La ubicación vive en crm_customers (permanente,
-- por cliente) — se actualiza en JS desde findOrCreateCustomerByPhone, no
-- pasa por record_sale. El barrio de cada venta es texto libre puntual,
-- igual que destination_city ya funciona hoy (no se sincroniza solo con el
-- barrio canónico del cliente).
-- ═══════════════════════════════════════════════════════════════════════════

alter table crm_customers add column if not exists neighborhood text;
alter table crm_customers add column if not exists latitude double precision;
alter table crm_customers add column if not exists longitude double precision;

alter table sales add column if not exists destination_neighborhood text;

drop function if exists record_sale(
  text, text, text, text, jsonb, timestamptz, text, text, text, text, text, text
);

create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null,
  p_customer_id text default null,
  p_shipping_method_detail text default null,
  p_destination_neighborhood text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (
    id, channel, staff_name, customer_note, sold_at,
    customer_name, customer_phone, destination_city, shipping_method,
    customer_id, shipping_method_detail, destination_neighborhood
  )
  values (
    p_id, p_channel, p_staff_name, p_customer_note, coalesce(p_sold_at, now()),
    p_customer_name, p_customer_phone, p_destination_city, p_shipping_method,
    p_customer_id, p_shipping_method_detail, p_destination_neighborhood
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot, product_id_snapshot, item_note
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot',
      nullif(v_item->>'product_id_snapshot', ''),
      v_item->>'item_note'
    );
  end loop;

  return p_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Rol "vendedor" (solo Inventario, solo lectura) + última conexión de cada
-- admin, para que el superadmin pueda ver quién está conectado en Usuarios.
-- ═══════════════════════════════════════════════════════════════════════════

alter table admin_users drop constraint if exists admin_users_role_check;
alter table admin_users
  add constraint admin_users_role_check
  check (role in ('superadmin', 'editor', 'viewer', 'vendedor'));

alter table admin_users add column if not exists last_seen_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════════
-- Precio mayorista: lo que le vendemos al vendedor para que revenda. Igual
-- que cost_price, es opcional y no interviene en las cuentas de Ventas.
-- ═══════════════════════════════════════════════════════════════════════════

alter table products add column if not exists wholesale_price numeric;

-- ═══════════════════════════════════════════════════════════════════════════
-- Códigos QR rastreables: cada campaña (bolsas de envío, flyer, cartel de
-- local, etc.) tiene su propio link /qr/<slug> — al escanearlo se suma 1 acá
-- y redirige a la home. Vercel Analytics registra la visita a /qr/<slug> en
-- paralelo (misma página, dos fuentes de datos: conteo propio + gráficos).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists qr_campaigns (
  slug text primary key,
  name text not null,
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now()
);

alter table qr_campaigns enable row level security;

insert into qr_campaigns (slug, name)
values ('bolsas', 'Bolsas de envío')
on conflict (slug) do nothing;

-- Suma atómica (evita perder un escaneo si dos personas escanean casi al
-- mismo tiempo, que con bolsas de envío en volumen es realista).
create or replace function increment_qr_scan(p_slug text)
returns boolean
language plpgsql
as $$
begin
  update qr_campaigns
  set scan_count = scan_count + 1, last_scanned_at = now()
  where slug = p_slug;
  return found;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Parches (ligas/competiciones) y personalización: catálogo de parches con
-- precio propio, relación manual producto↔parches (sin liga automática,
-- el admin elige a mano), y un flag por producto para habilitar la casilla
-- "Personalizado" en la ficha. El precio de personalización es único para
-- todo el catálogo (vive en site_settings, key "customBanner"), no acá.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists patches (
  id text primary key,
  name text not null,
  image text,
  price numeric(10, 2) not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table patches enable row level security;

create trigger patches_set_updated_at
  before update on patches
  for each row
  execute function set_updated_at();

create table if not exists product_patches (
  product_id text not null references products (id) on delete cascade,
  patch_id text not null references patches (id) on delete cascade,
  primary key (product_id, patch_id)
);

alter table product_patches enable row level security;

alter table products add column if not exists is_customizable boolean not null default false;

-- ═══════════════════════════════════════════════════════════════════════════
-- Parches: soportar conjuntos de varias piezas (ej. Champions League son 2
-- parchecitos que van juntos) y agruparlos en carpetas desde el admin.
-- ═══════════════════════════════════════════════════════════════════════════

alter table patches add column if not exists images text[] not null default '{}';
update patches set images = array[image] where image is not null and images = '{}';
alter table patches drop column if exists image;

alter table patches add column if not exists category text;

-- ═══════════════════════════════════════════════════════════════════════════
-- Stock de parches: cuántos quedan disponibles, para saber cuándo reponer.
-- Es un contador simple (sin ledger de movimientos como product_variants) —
-- el admin lo edita a mano desde el mismo formulario del parche.
-- ═══════════════════════════════════════════════════════════════════════════

alter table patches add column if not exists stock_on_hand integer not null default 0 check (stock_on_hand >= 0);

-- ═══════════════════════════════════════════════════════════════════════════
-- Página "Ayuda": cuidado de la camiseta (lavado de dorsales termosellados).
-- ═══════════════════════════════════════════════════════════════════════════

insert into pages (slug, title, body, placement, sort_order) values
(
  'cuidado-de-la-camiseta',
  'Cuidado de la camiseta',
  E'Si tu camiseta tiene nombre y dorsal termosellados (aplicados con calor, no bordados), estos cuidados extienden mucho su vida útil y evitan que el estampado se agriete o se despegue.\n\nAntes de lavarla, dala vuelta del revés y cerrá cualquier cierre o velcro que tenga. Si hay manchas de pasto o comida, dejala en remojo con agua fría y un poco de vinagre blanco durante 30 minutos antes del lavado.\n\nLavala siempre con agua fría (no más de 30°C), a mano o en lavarropas en ciclo delicado, separada de prendas con cierres, botones o superficies ásperas que puedan rozar el estampado. Si la lavás a máquina, una bolsa de lavado o funda la protege todavía más.\n\nUsá un detergente suave, sin cloro ni blanqueador, y evitá el suavizante: deja una capa que tapa los poros de la tela y hace que la camiseta transpire menos.\n\nNo uses secadora. Colgala en una percha y dejala secar a la sombra, nunca al sol directo — el calor y los rayos UV son la principal causa de que el nombre, el dorsal o los escudos pierdan color o se despeguen.\n\nEvitá planchar directamente sobre el nombre, el dorsal o los escudos. Si necesitás plancharla, hacelo del revés, con temperatura baja y, si podés, un paño fino entre la plancha y el estampado.\n\nGuardala doblada en un lugar seco, sin que quede prensada contra otras prendas con cierres o velcro que puedan enganchar el estampado.\n\nSi tenés dudas sobre cómo cuidar un modelo en particular, escribinos por WhatsApp.',
  'ayuda',
  6
)
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Editar una venta ya registrada. Repone el stock de las líneas viejas
-- (mismo criterio que ya usa la eliminación: un movimiento "return" por cada
-- línea con variant_id real, nunca se toca stock_on_hand a mano), reemplaza
-- las líneas por las nuevas (el trigger de sale_items ya existente descuenta
-- stock de las nuevas cantidades solo) y actualiza los datos de la cabecera.
-- Todo en una sola función para que sea atómico.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function update_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null,
  p_customer_id text default null,
  p_shipping_method_detail text default null,
  p_destination_neighborhood text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
  v_old_item record;
begin
  for v_old_item in
    select variant_id, quantity from sale_items
    where sale_id = p_id and variant_id is not null
  loop
    insert into inventory_movements (variant_id, movement_type, quantity_delta, note)
    values (
      v_old_item.variant_id,
      'return',
      v_old_item.quantity,
      'Reposición de stock por edición de venta'
    );
  end loop;

  delete from sale_items where sale_id = p_id;

  update sales set
    channel = p_channel,
    staff_name = p_staff_name,
    customer_note = p_customer_note,
    sold_at = coalesce(p_sold_at, sold_at),
    customer_name = p_customer_name,
    customer_phone = p_customer_phone,
    destination_city = p_destination_city,
    shipping_method = p_shipping_method,
    customer_id = p_customer_id,
    shipping_method_detail = p_shipping_method_detail,
    destination_neighborhood = p_destination_neighborhood
  where id = p_id;

  if not found then
    raise exception 'Venta % no encontrada', p_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot, product_id_snapshot, item_note
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot',
      nullif(v_item->>'product_id_snapshot', ''),
      v_item->>'item_note'
    );
  end loop;

  return p_id;
end;
$$;

-- ── Control interno de stock (independiente del modo de stock) ─────────────
-- Permite cargar cantidad real por talla (product_variants) incluso en
-- productos "ajeno"/"importado", solo para uso interno — el storefront
-- sigue mostrando "Consultar talle" sin importar este valor.
alter table products
  add column if not exists internal_control boolean not null default false;

-- ═══════════════════════════════════════════════════════════════════════════
-- Proveedores: lista de precios por producto (un producto puede comprarse a
-- varios proveedores, cada uno a un costo distinto) + trazabilidad de cuál
-- proveedor abasteció cada línea de venta. No es un sistema de lotes con
-- cantidad restante por proveedor a propósito — product_variants/
-- inventory_movements siguen siendo la única fuente de verdad del stock,
-- esto es puramente precio de compra + etiqueta.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists suppliers (
  id text primary key,
  name text not null unique,
  notes text,
  created_at timestamptz not null default now()
);
alter table suppliers enable row level security;

create table if not exists product_suppliers (
  product_id text not null references products(id) on delete cascade,
  supplier_id text not null references suppliers(id) on delete cascade,
  unit_cost numeric(10,2) not null check (unit_cost >= 0),
  primary key (product_id, supplier_id)
);
alter table product_suppliers enable row level security;

-- Snapshot histórico (mismo patrón que product_id_snapshot/product_name_snapshot):
-- si el proveedor se borra después, el nombre de la venta ya hecha no se pierde.
alter table sale_items add column if not exists supplier_id_snapshot text references suppliers(id) on delete set null;
alter table sale_items add column if not exists supplier_name_snapshot text;

-- record_sale/update_sale redefinidas para grabar supplier_id_snapshot/
-- supplier_name_snapshot junto al resto de sale_items (única diferencia vs
-- las versiones anteriores, más arriba en este archivo).
create or replace function record_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null,
  p_customer_id text default null,
  p_shipping_method_detail text default null,
  p_destination_neighborhood text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
begin
  insert into sales (
    id, channel, staff_name, customer_note, sold_at,
    customer_name, customer_phone, destination_city, shipping_method,
    customer_id, shipping_method_detail, destination_neighborhood
  )
  values (
    p_id, p_channel, p_staff_name, p_customer_note, coalesce(p_sold_at, now()),
    p_customer_name, p_customer_phone, p_destination_city, p_shipping_method,
    p_customer_id, p_shipping_method_detail, p_destination_neighborhood
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot, product_id_snapshot, item_note,
      supplier_id_snapshot, supplier_name_snapshot
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot',
      nullif(v_item->>'product_id_snapshot', ''),
      v_item->>'item_note',
      nullif(v_item->>'supplier_id_snapshot', ''),
      v_item->>'supplier_name_snapshot'
    );
  end loop;

  return p_id;
end;
$$;

create or replace function update_sale(
  p_id text,
  p_channel text,
  p_staff_name text,
  p_customer_note text,
  p_items jsonb,
  p_sold_at timestamptz default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_destination_city text default null,
  p_shipping_method text default null,
  p_customer_id text default null,
  p_shipping_method_detail text default null,
  p_destination_neighborhood text default null
)
returns text
language plpgsql
as $$
declare
  v_item jsonb;
  v_old_item record;
begin
  for v_old_item in
    select variant_id, quantity from sale_items
    where sale_id = p_id and variant_id is not null
  loop
    insert into inventory_movements (variant_id, movement_type, quantity_delta, note)
    values (
      v_old_item.variant_id,
      'return',
      v_old_item.quantity,
      'Reposición de stock por edición de venta'
    );
  end loop;

  delete from sale_items where sale_id = p_id;

  update sales set
    channel = p_channel,
    staff_name = p_staff_name,
    customer_note = p_customer_note,
    sold_at = coalesce(p_sold_at, sold_at),
    customer_name = p_customer_name,
    customer_phone = p_customer_phone,
    destination_city = p_destination_city,
    shipping_method = p_shipping_method,
    customer_id = p_customer_id,
    shipping_method_detail = p_shipping_method_detail,
    destination_neighborhood = p_destination_neighborhood
  where id = p_id;

  if not found then
    raise exception 'Venta % no encontrada', p_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (
      sale_id, variant_id, quantity, unit_price, cost_price,
      product_name_snapshot, size_snapshot, product_id_snapshot, item_note,
      supplier_id_snapshot, supplier_name_snapshot
    )
    values (
      p_id,
      nullif(v_item->>'variant_id', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'cost_price')::numeric, 0),
      v_item->>'product_name_snapshot',
      v_item->>'size_snapshot',
      nullif(v_item->>'product_id_snapshot', ''),
      v_item->>'item_note',
      nullif(v_item->>'supplier_id_snapshot', ''),
      v_item->>'supplier_name_snapshot'
    );
  end loop;

  return p_id;
end;
$$;

-- record_sale y update_sale redefinidas para insertar supplier_id_snapshot/
-- supplier_name_snapshot junto al resto de las columnas de sale_items — ver
-- las últimas definiciones de cada una más arriba en este archivo (no se
-- repiten acá completas para no duplicar; el cambio real es agregar esas
-- dos columnas al insert into sale_items de cada función).

-- ── Hardening de seguridad (auditoría 2026-09-02) ───────────────────────────
-- El linter de seguridad de Supabase señaló estas 6 funciones sin
-- search_path fijo. Ninguna es SECURITY DEFINER (verificado antes de
-- aplicar: todas corren como SECURITY INVOKER, siempre invocadas desde
-- supabaseAdmin/service_role server-side), así que no cambia su
-- comportamiento — solo cierra la recomendación del linter.
alter function set_updated_at() set search_path = public;
alter function apply_inventory_movement() set search_path = public;
alter function create_sale_inventory_movement() set search_path = public;
alter function increment_qr_scan(text) set search_path = public;
alter function record_sale(text, text, text, text, jsonb, timestamptz, text, text, text, text, text, text, text) set search_path = public;
alter function update_sale(text, text, text, text, jsonb, timestamptz, text, text, text, text, text, text, text) set search_path = public;

-- handle_new_customer() es SECURITY DEFINER y solo debe correr como trigger
-- de auth.users (ese disparo no depende de estos grants). Postgres otorga
-- EXECUTE a PUBLIC por defecto al crear una función, lo que dejaba esta
-- función técnicamente invocable vía /rest/v1/rpc/handle_new_customer por
-- cualquiera con la anon key (aunque al ser "returns trigger" fallaba si se
-- llamaba fuera de un trigger real). Se le saca ese acceso público.
revoke execute on function public.handle_new_customer() from public;
