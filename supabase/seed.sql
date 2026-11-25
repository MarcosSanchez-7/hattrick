-- ============================================================================
-- Fase 4B.2 -- Datos sintéticos para el entorno LOCAL de pruebas de HATTRICK.
--
-- 100% ficticio: ningún id/nombre/teléfono/precio sale de producción, nada
-- se descargó ni copió de ahí. Identificadores con prefijo "test-"/"-test"
-- a propósito, para que nunca se confundan con datos reales si alguien
-- mira la base por error. Reproducible: `supabase db reset` vuelve a
-- correr este archivo completo desde cero cada vez (ver db.seed en
-- supabase/config.jsonc).
--
-- Cubre (ver autorización de la Fase 4B.2): categorías y subcategorías,
-- productos visibles/ocultos, con/sin variantes, agotados, en oferta,
-- nuevos, una categoría oculta (para probar la cascada de ocultamiento),
-- parches, proveedores (ejercitando product_suppliers/
-- product_supplier_sizes -- la tabla agregada por la migración inicial),
-- inventario (vía inventory_movements real, no stock_on_hand a mano, para
-- probar el trigger apply_inventory_movement), una venta histórica (vía la
-- función record_sale, no un insert directo), settings públicos, páginas
-- informativas, un administrador de pruebas y un cliente ficticio.
-- ============================================================================

-- ── Categorías (una raíz con una subcategoría, una raíz sin hijos, y una
--    raíz OCULTA -- para probar que ocultar una categoría apaga también a
--    sus productos, no solo el menú) ────────────────────────────────────
insert into categories (slug, name, tagline, description, is_visible, parent_slug) values
  ('test-futbol', 'Fútbol (prueba)', 'Equipos de fútbol', 'Categoría de prueba: fútbol', true, null),
  ('test-futbol-seleccion', 'Selecciones (prueba)', 'Camisetas de selección', 'Subcategoría de prueba', true, 'test-futbol'),
  ('test-basket', 'Básquet (prueba)', 'Equipos de básquet', 'Categoría de prueba: básquet', true, null),
  ('test-categoria-oculta', 'Categoría oculta (prueba)', 'No debería verse', 'Categoría oculta de prueba', false, null);

-- ── Etiquetas ────────────────────────────────────────────────────────────
insert into tags (name, color, is_filter) values
  ('Versión Jugador', '#1d4ed8', false),
  ('Premier League', '#16a34a', true);

-- ── Parches (uno visible, uno oculto) ───────────────────────────────────
insert into patches (id, name, images, price, is_visible, category, stock_on_hand) values
  ('patch-test-mundial', 'Parche Mundial 2026 (prueba)', '{}', 15000, true, null, 50),
  ('patch-test-oculto', 'Parche oculto (prueba)', '{}', 15000, false, null, 10);

-- ── Proveedores ──────────────────────────────────────────────────────────
insert into suppliers (id, name, notes) values
  ('sup-test-uno', 'Proveedor Test Uno', 'Proveedor ficticio -- Fase 4B.2'),
  ('sup-test-dos', 'Proveedor Test Dos', 'Proveedor ficticio -- Fase 4B.2');

-- ── Productos ────────────────────────────────────────────────────────────
-- 1) Visible, con variantes, con stock, con parche y dos proveedores (con
--    desglose por talla -- ejercita product_suppliers/product_supplier_sizes).
insert into products (id, slug, name, category, price, compare_at, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, tags, images,
  stock_mode, internal_control, is_visible, is_customizable)
values ('p-test-visible', 'test-camiseta-visible', 'Camiseta de Prueba Visible', 'test-futbol',
  280000, null, false, 5, 12, '#0b3d91', '#ffffff', '#f2c230', 'stripes',
  'Producto sintético -- Fase 4B.2.', array['Versión Jugador'], '{}',
  'propio', false, true, true);

-- 2) Oculto (is_visible = false en el PRODUCTO mismo, categoría visible).
insert into products (id, slug, name, category, price, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, stock_mode, internal_control, is_visible)
values ('p-test-oculto', 'test-camiseta-oculta', 'Camiseta de Prueba Oculta', 'test-futbol',
  260000, false, 5, 0, '#111111', '#222222', '#333333', 'solid',
  'Producto sintético oculto -- Fase 4B.2.', 'propio', false, false);

-- 3) Agotado (visible, propio, todas las tallas en 0).
insert into products (id, slug, name, category, price, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, stock_mode, internal_control, is_visible)
values ('p-test-agotado', 'test-camiseta-agotada', 'Camiseta de Prueba Agotada', 'test-futbol',
  270000, false, 5, 3, '#7a1f1f', '#ffffff', '#ffd700', 'solid',
  'Producto sintético agotado -- Fase 4B.2.', 'propio', false, true);

-- 4) En oferta (compare_at > price).
insert into products (id, slug, name, category, price, compare_at, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, stock_mode, internal_control, is_visible)
values ('p-test-oferta', 'test-camiseta-oferta', 'Camiseta de Prueba en Oferta', 'test-basket',
  199000, 259000, false, 4, 8, '#1d4ed8', '#ffffff', '#f97316', 'solid',
  'Producto sintético en oferta -- Fase 4B.2.', 'propio', false, true);

-- 5) Nuevo (is_new = true).
insert into products (id, slug, name, category, price, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, stock_mode, internal_control, is_visible)
values ('p-test-novedad', 'test-camiseta-novedad', 'Camiseta de Prueba Nueva', 'test-basket',
  310000, true, 5, 0, '#047857', '#ffffff', '#111111', 'solid',
  'Producto sintético nuevo -- Fase 4B.2.', 'propio', false, true);

-- 6) Sin variantes propias (stock_mode = 'ajeno' -- "Consultar talle").
insert into products (id, slug, name, category, price, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, stock_mode, internal_control, is_visible)
values ('p-test-sin-variantes', 'test-camiseta-sin-variantes', 'Camiseta de Prueba Sin Variantes', 'test-futbol-seleccion',
  150000, false, 5, 1, '#374151', '#ffffff', '#9ca3af', 'solid',
  'Producto sintético sin stock propio -- Fase 4B.2.', 'ajeno', false, true);

-- 7) Dentro de la categoría oculta (is_visible propio en true, pero la
--    categoría está oculta -- debe desaparecer en cascada).
insert into products (id, slug, name, category, price, is_new, rating, reviews,
  color_primary, color_secondary, color_accent, pattern, description, stock_mode, internal_control, is_visible)
values ('p-test-cat-oculta', 'test-camiseta-categoria-oculta', 'Camiseta en Categoría Oculta', 'test-categoria-oculta',
  220000, false, 5, 0, '#000000', '#ffffff', '#ff0000', 'solid',
  'Producto sintético en categoría oculta -- Fase 4B.2.', 'propio', false, true);

-- ── Variantes (tallas) -- se crean en 0 y se suben con inventory_movements
--    reales más abajo, igual que lo hace syncProductVariants() en la app. ──
insert into product_variants (id, product_id, size, stock_on_hand) values
  ('pv-test-visible-m', 'p-test-visible', 'M', 0),
  ('pv-test-visible-l', 'p-test-visible', 'L', 0),
  ('pv-test-oculto-m', 'p-test-oculto', 'M', 0),
  ('pv-test-agotado-m', 'p-test-agotado', 'M', 0),
  ('pv-test-agotado-l', 'p-test-agotado', 'L', 0),
  ('pv-test-oferta-m', 'p-test-oferta', 'M', 0),
  ('pv-test-novedad-m', 'p-test-novedad', 'M', 0),
  ('pv-test-cat-oculta-m', 'p-test-cat-oculta', 'M', 0);

-- ── Inventario: movimientos reales de "restock" -- dispara
--    apply_inventory_movement(), que suma a stock_on_hand (mismo camino
--    que insertMovement() en lib/data.ts). p-test-agotado se deja en 0 a
--    propósito (no se le inserta movimiento). ──────────────────────────
insert into inventory_movements (variant_id, movement_type, quantity_delta, note) values
  ('pv-test-visible-m', 'restock', 15, 'Carga inicial -- Fase 4B.2'),
  ('pv-test-visible-l', 'restock', 8, 'Carga inicial -- Fase 4B.2'),
  ('pv-test-oculto-m', 'restock', 5, 'Carga inicial -- Fase 4B.2'),
  ('pv-test-oferta-m', 'restock', 20, 'Carga inicial -- Fase 4B.2'),
  ('pv-test-novedad-m', 'restock', 10, 'Carga inicial -- Fase 4B.2'),
  ('pv-test-cat-oculta-m', 'restock', 6, 'Carga inicial -- Fase 4B.2');
-- pv-test-agotado-m / pv-test-agotado-l: sin movimiento -- quedan en 0 (agotado real).

-- ── Parche asignado al producto 1 ───────────────────────────────────────
insert into product_patches (product_id, patch_id) values ('p-test-visible', 'patch-test-mundial');

-- ── Proveedores del producto 1 (precio + desglose por talla -- ejercita
--    product_suppliers/product_supplier_sizes, la tabla agregada por la
--    migración inicial de esta fase). product_suppliers.quantity queda en
--    su default (0): nadie la escribe desde la app al crear, solo los
--    triggers de venta la ajustan después. ─────────────────────────────
insert into product_suppliers (product_id, supplier_id, unit_cost) values
  ('p-test-visible', 'sup-test-uno', 120000),
  ('p-test-visible', 'sup-test-dos', 130000);

insert into product_supplier_sizes (product_id, supplier_id, size, quantity) values
  ('p-test-visible', 'sup-test-uno', 'M', 10),
  ('p-test-visible', 'sup-test-uno', 'L', 5),
  ('p-test-visible', 'sup-test-dos', 'M', 5),
  ('p-test-visible', 'sup-test-dos', 'L', 3);

-- ── Cliente ficticio (CRM) y una venta histórica real, vía record_sale()
--    -- no un insert directo a sales/sale_items -- para ejercitar también
--    el trigger create_sale_inventory_movement en el propio seed. ──────
insert into crm_customers (id, name, phone, phone_normalized, city) values
  ('cust-test-01', 'Cliente de Prueba', '+595 999 000 111', '595999000111', 'Asunción');

select record_sale(
  'sale-test-01', 'store', 'Vendedor de Prueba', 'Venta sintética -- Fase 4B.2',
  '[{"variant_id":"pv-test-visible-m","quantity":2,"unit_price":280000,"cost_price":120000}]'::jsonb,
  null, 'Cliente de Prueba', '+595 999 000 111', 'Asunción', 'retiro', 'cust-test-01', null, null
);

-- ── Settings públicos (solo unas pocas keys con un override puntual para
--    confirmar visualmente que vienen de la base, no del default -- el
--    resto de las keys quedan en su DEFAULT_* normal, que es el
--    comportamiento real de getSetting() ante una key sin fila). ────────
insert into site_settings (key, value) values
  ('footer', '{"whatsappNumber":"595900000000","brandDescription":"Entorno LOCAL de pruebas de HATTRICK -- Fase 4B.2, no es producción."}'),
  ('wholesale', '{"teaserEnabled":true,"teaserText":"[LOCAL] Precios mayoristas de prueba"}');

-- ── Páginas informativas ─────────────────────────────────────────────────
insert into pages (slug, title, body, placement, sort_order) values
  ('test-envios', 'Envíos (prueba)', 'Página informativa sintética de envíos -- Fase 4B.2.', 'ayuda', 0),
  ('test-legal', 'Términos (prueba)', 'Página informativa sintética legal -- Fase 4B.2.', 'legal', 0);

-- ── Administrador de pruebas ─────────────────────────────────────────────
-- Email/password 100% ficticios, documentados en el reporte de la Fase
-- 4B.2 -- válidos SOLO contra esta base local efímera (puerto 54322 de
-- Docker, inalcanzable desde fuera de esta máquina). hash = scryptSync
-- (mismo esquema que hashPassword() en lib/admin-auth.ts) de
-- "TestAdmin123!" con salt fijo "hattrick-local-test-fixed-salt01" --
-- fijo a propósito (no aleatorio) para que el seed sea reproducible byte a
-- byte en cada `supabase db reset`.
insert into admin_users (id, name, email, password_hash, role) values
  ('admin-test-01', 'Admin de Pruebas', 'admin@test.local',
   'hattrick-local-test-fixed-salt01:36f1c8bc2a7991d38c152956a7f08aa93b5c7f6933c81527cd10d1173ffe249a6a8bfc20efeb1449250ba2d04168cb8f8887618abe285c53fa83c9f83e242ee1',
   'superadmin');
