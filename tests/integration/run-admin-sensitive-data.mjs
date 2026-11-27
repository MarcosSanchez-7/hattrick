// Fase 8B.2 -- viewer nunca debe recibir información sensible, ni en JSON
// ni en el HTML/RSC de una página real -- se confirma con valores
// sintéticos IDENTIFICABLES (fáciles de buscar como substring exacto) en
// vez de asumir por la forma del código. Mismo contrato que los otros
// archivos de tests/integration (servidor real :3100, Supabase local).
import { loadAndAssertTestEnv } from "../../scripts/test-env.mjs";
import { execFileSync } from "node:child_process";

const env = loadAndAssertTestEnv();
const BASE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

function psql(sql) {
  return execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

function psqlExec(sql) {
  execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
}

/** El `-q` evita que psql mezcle el tag `INSERT 0 1` con el valor de
 * `RETURNING`. Esta vía queda local al fixture porque los SELECT existentes
 * usan la salida normal de psql. */
function psqlReturningFixtureId(sql) {
  const output = execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-q", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
  const values = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) {
    throw new Error(`INSERT de fixture devolvió un identificador ambiguo o inválido: ${JSON.stringify(output)}`);
  }
  const id = Number(values[0]);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`INSERT de fixture devolvió un bigint fuera del rango seguro: ${values[0]}`);
  }
  return id;
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login falló para ${email}: ${res.status}`);
  return res.headers.get("set-cookie").split(";")[0];
}

async function getJson(path, cookie) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json, raw: text };
}

async function getHtml(path, cookie) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
  });
  const html = res.status < 400 ? await res.text() : "";
  return { status: res.status, html, location: res.headers.get("location") };
}

const SUPERADMIN = { email: "admin@test.local", password: "TestAdmin123!" };
const SYNTH_PASSWORD = "Sensitive8B2Pass!";

const MAGIC_COST = "777777";
const MAGIC_WHOLESALE = "888888";
const MAGIC_SUPPLIER_NAME = "SensitiveSupplier8B2";
const MAGIC_SUPPLIER_COST = "555555";
const MAGIC_PHONE = "+595999777888";
const MAGIC_CUSTOMER_NAME = "SensitiveCustomer8B2";
const MAGIC_MOVEMENT_NOTE = "Sensitive sale movement 8C-R3";
const MAGIC_MOVEMENT_ADMIN = "Sensitive Movement Admin 8C-R3";

const results = [];
function record(scenario, pass, notes) {
  results.push({ scenario, pass, notes });
  console.log(`[${pass ? "OK  " : "FAIL"}] ${scenario}${notes ? ` -- ${notes}` : ""}`);
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let superadminCookie, viewerCookie, editorCookie, vendedorCookie;
let productId, supplierId, customerId, movementId, viewerUserId, editorUserId, vendedorUserId;

async function setup() {
  psqlExec(`delete from inventory_movements where note = '${MAGIC_MOVEMENT_NOTE}';`);
  psqlExec(`delete from admin_users where email like 'synth-sensitive-%@test.local';`);
  psqlExec(`delete from products where slug = 'synth-sensitive-8b2';`);
  psqlExec(`delete from suppliers where name = '${MAGIC_SUPPLIER_NAME}';`);
  psqlExec(`delete from crm_customers where name = '${MAGIC_CUSTOMER_NAME}';`);

  superadminCookie = await login(SUPERADMIN.email, SUPERADMIN.password);

  const mkUser = async (role, email) => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: superadminCookie },
      body: JSON.stringify({ name: `Synth ${role} sensitive`, email, password: SYNTH_PASSWORD, role }),
    });
    const data = await res.json();
    assert(res.status === 201, `no se pudo crear ${email}: ${JSON.stringify(data)}`);
    return data.id;
  };
  viewerUserId = await mkUser("viewer", "synth-sensitive-viewer@test.local");
  editorUserId = await mkUser("editor", "synth-sensitive-editor@test.local");
  vendedorUserId = await mkUser("vendedor", "synth-sensitive-vendedor@test.local");
  viewerCookie = await login("synth-sensitive-viewer@test.local", SYNTH_PASSWORD);
  editorCookie = await login("synth-sensitive-editor@test.local", SYNTH_PASSWORD);
  vendedorCookie = await login("synth-sensitive-vendedor@test.local", SYNTH_PASSWORD);

  // Proveedor con costo identificable.
  const supRes = await fetch(`${BASE_URL}/api/admin/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: superadminCookie },
    body: JSON.stringify({ name: MAGIC_SUPPLIER_NAME }),
  });
  const supData = await supRes.json();
  assert(supRes.status === 201, `no se pudo crear el proveedor: ${JSON.stringify(supData)}`);
  supplierId = supData.id;

  // Producto con costPrice/wholesalePrice/proveedor identificables.
  const prodRes = await fetch(`${BASE_URL}/api/admin/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: superadminCookie },
    body: JSON.stringify({
      slug: "synth-sensitive-8b2",
      name: "Synth Sensitive 8B2",
      category: "test-futbol",
      price: 150000,
      costPrice: Number(MAGIC_COST),
      wholesalePrice: Number(MAGIC_WHOLESALE),
      colors: { primary: "#000", secondary: "#fff", accent: "#000" },
      pattern: "solid",
      description: "x",
      stockMode: "importado",
      internalControl: true,
      variantQuantities: { M: 6 },
      suppliers: [{ supplierId, unitCost: Number(MAGIC_SUPPLIER_COST) }],
      supplierSizeStock: [{ supplierId, size: "M", quantity: 5 }],
    }),
  });
  const prodData = await prodRes.json();
  assert(prodRes.status === 201, `no se pudo crear el producto: ${JSON.stringify(prodData)}`);
  productId = prodData.id;

  const variantId = psql(`select id from product_variants where product_id = '${productId}' and size = 'M';`);
  assert(variantId, "no se creó la variante M para el fixture sensible");
  movementId = psqlReturningFixtureId(
    `insert into inventory_movements (variant_id, movement_type, quantity_delta, note, created_by) values ('${variantId}', 'sale_online', -1, '${MAGIC_MOVEMENT_NOTE}', '${MAGIC_MOVEMENT_ADMIN}') returning id;`,
  );
  const createdMovement = psql(`select movement_type || '|' || note || '|' || created_by from inventory_movements where id = ${movementId};`);
  assert(
    createdMovement === `sale_online|${MAGIC_MOVEMENT_NOTE}|${MAGIC_MOVEMENT_ADMIN}`,
    `el movimiento creado no coincide con el fixture esperado: ${createdMovement}`,
  );

  // Cliente con nombre/teléfono identificables.
  const custRes = await fetch(`${BASE_URL}/api/admin/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: superadminCookie },
    body: JSON.stringify({ name: MAGIC_CUSTOMER_NAME, phone: MAGIC_PHONE }),
  });
  const custData = await custRes.json();
  assert(custRes.status === 201, `no se pudo crear el cliente: ${JSON.stringify(custData)}`);
  customerId = custData.id;
}

async function teardown() {
  if (movementId) psqlExec(`delete from inventory_movements where id = ${movementId};`);
  for (const id of [viewerUserId, editorUserId, vendedorUserId]) {
    if (id) await fetch(`${BASE_URL}/api/admin/users/${id}`, { method: "DELETE", headers: { Cookie: superadminCookie } }).catch(() => {});
  }
  if (productId) await fetch(`${BASE_URL}/api/admin/products/${productId}`, { method: "DELETE", headers: { Cookie: superadminCookie } }).catch(() => {});
  if (customerId) await fetch(`${BASE_URL}/api/admin/customers/${customerId}`, { method: "DELETE", headers: { Cookie: superadminCookie } }).catch(() => {});
  if (supplierId) await fetch(`${BASE_URL}/api/admin/suppliers/${supplierId}`, { method: "DELETE", headers: { Cookie: superadminCookie } }).catch(() => {});
  psqlExec(`delete from admin_users where email like 'synth-sensitive-%@test.local';`);
  psqlExec(`delete from inventory_movements where note = '${MAGIC_MOVEMENT_NOTE}';`);
  psqlExec(`delete from products where slug = 'synth-sensitive-8b2';`);
  psqlExec(`delete from suppliers where name = '${MAGIC_SUPPLIER_NAME}';`);
  psqlExec(`delete from crm_customers where name = '${MAGIC_CUSTOMER_NAME}';`);
}

async function main() {
  console.log(`\n== Fase 8B.2 -- protección de datos sensibles contra ${BASE_URL} ==\n`);
  await setup();

  let originalError;
  try {
    // Confirmación previa: los valores EXISTEN en la base (no es que
    // nunca se escribieron).
    const rawCost = psql(`select cost_price, wholesale_price, internal_control from products where id = '${productId}';`);
    const rawSupplierSize = psql(`select supplier_id, size, quantity from product_supplier_sizes where product_id = '${productId}';`);
    record(
      "los valores sensibles sintéticos quedaron persistidos en Postgres (precio, control interno y talla de proveedor)",
      rawCost.includes(MAGIC_COST) && rawCost.includes(MAGIC_WHOLESALE) && rawCost.includes("t") && rawSupplierSize.includes(supplierId) && rawSupplierSize.includes("M") && rawSupplierSize.includes("5"),
      `${rawCost}; ${rawSupplierSize}`,
    );
    const rawMovement = psql(`select movement_type || '|' || note || '|' || created_by from inventory_movements where id = ${movementId};`);
    record(
      "el movimiento de venta sintético quedó persistido en Postgres con tipo, nota y responsable identificables",
      rawMovement.includes("sale_online") && rawMovement.includes(MAGIC_MOVEMENT_NOTE) && rawMovement.includes(MAGIC_MOVEMENT_ADMIN),
      rawMovement,
    );

    // superadmin SÍ ve todo.
    const asSuperadmin = await getJson(`/api/admin/products/${productId}`, superadminCookie);
    record(
      "superadmin recibe costPrice/wholesalePrice/suppliers completos vía GET /api/admin/products/{id} (200, no vacío)",
      asSuperadmin.status === 200 &&
        String(asSuperadmin.body.costPrice) === MAGIC_COST &&
        String(asSuperadmin.body.wholesalePrice) === MAGIC_WHOLESALE &&
        asSuperadmin.body.internalControl === true &&
        asSuperadmin.body.suppliers?.some((s) => String(s.unitCost) === MAGIC_SUPPLIER_COST && s.supplierId === supplierId) &&
        asSuperadmin.body.supplierSizeStock?.some((s) => s.supplierId === supplierId && s.size === "M" && s.quantity === 5),
      JSON.stringify(asSuperadmin.body).slice(0, 200),
    );

    // editor también (tiene products.write + suppliers.read).
    const asEditor = await getJson(`/api/admin/products/${productId}`, editorCookie);
    record(
      "editor también recibe costPrice/wholesalePrice/suppliers completos (200, tiene products.write y suppliers.read)",
      asEditor.status === 200 &&
        String(asEditor.body.costPrice) === MAGIC_COST &&
        String(asEditor.body.wholesalePrice) === MAGIC_WHOLESALE &&
        asEditor.body.internalControl === true &&
        asEditor.body.supplierSizeStock?.some((s) => s.supplierId === supplierId),
      JSON.stringify(asEditor.body).slice(0, 200),
    );

    const movementsAsSuperadmin = await getJson("/api/admin/inventory/movements", superadminCookie);
    record(
      "superadmin recibe 200 y el movimiento sensible por la API de historial",
      movementsAsSuperadmin.status === 200 && Array.isArray(movementsAsSuperadmin.body) && movementsAsSuperadmin.raw.includes(MAGIC_MOVEMENT_NOTE) && movementsAsSuperadmin.raw.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${movementsAsSuperadmin.status}`,
    );
    const movementsAsEditor = await getJson("/api/admin/inventory/movements", editorCookie);
    record(
      "editor recibe 200 y el movimiento sensible por la API de historial",
      movementsAsEditor.status === 200 && Array.isArray(movementsAsEditor.body) && movementsAsEditor.raw.includes(MAGIC_MOVEMENT_NOTE) && movementsAsEditor.raw.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${movementsAsEditor.status}`,
    );
    const historyAsSuperadmin = await getHtml("/gestion-ssjblue/inventario/movimientos", superadminCookie);
    record(
      "superadmin recibe 200 y el movimiento sensible en la página de historial",
      historyAsSuperadmin.status === 200 && historyAsSuperadmin.html.includes(MAGIC_MOVEMENT_NOTE) && historyAsSuperadmin.html.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${historyAsSuperadmin.status}`,
    );
    const historyAsEditor = await getHtml("/gestion-ssjblue/inventario/movimientos", editorCookie);
    record(
      "editor recibe 200 y el movimiento sensible en la página de historial",
      historyAsEditor.status === 200 && historyAsEditor.html.includes(MAGIC_MOVEMENT_NOTE) && historyAsEditor.html.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${historyAsEditor.status}`,
    );

    // viewer: 200 real (no vacío, no 500), pero SIN los campos sensibles.
    const asViewer = await getJson(`/api/admin/products/${productId}`, viewerCookie);
    record(
      "viewer recibe 200 real con identidad del producto (nombre correcto) -- no es una página vacía ni un error disfrazado de 'sin filtración'",
      asViewer.status === 200 && asViewer.body.name === "Synth Sensitive 8B2",
      `status=${asViewer.status} name=${asViewer.body?.name}`,
    );
    record(
      "viewer NO recibe campos sensibles en el mismo JSON (no solo valores vacíos)",
      !Object.hasOwn(asViewer.body, "costPrice") &&
        !Object.hasOwn(asViewer.body, "wholesalePrice") &&
        !Object.hasOwn(asViewer.body, "internalControl") &&
        !Object.hasOwn(asViewer.body, "suppliers") &&
        !Object.hasOwn(asViewer.body, "supplierSizeStock"),
      JSON.stringify(asViewer.body),
    );
    record(
      "el JSON crudo completo de la respuesta a viewer no contiene ninguno de los valores mágicos como substring",
      !asViewer.raw.includes(MAGIC_COST) &&
        !asViewer.raw.includes(MAGIC_WHOLESALE) &&
        !asViewer.raw.includes(MAGIC_SUPPLIER_COST) &&
        !asViewer.raw.includes(MAGIC_SUPPLIER_NAME) &&
        !asViewer.raw.includes(supplierId),
      "grep de substring sobre el body completo",
    );

    // Lo mismo contra el listado completo (no solo el detalle por id).
    const listAsViewer = await getJson("/api/admin/products", viewerCookie);
    record(
      "el listado completo (GET /api/admin/products) tampoco filtra los valores mágicos a viewer, en NINGÚN producto",
      listAsViewer.status === 200 &&
        !listAsViewer.raw.includes(MAGIC_COST) &&
        !listAsViewer.raw.includes(MAGIC_WHOLESALE) &&
        !listAsViewer.raw.includes(MAGIC_SUPPLIER_NAME) &&
        !listAsViewer.raw.includes(supplierId),
      `status=${listAsViewer.status}`,
    );

    const movementsAsViewer = await getJson("/api/admin/inventory/movements", viewerCookie);
    record(
      "viewer: GET /api/admin/inventory/movements da 403 y no entrega el movimiento sensible",
      movementsAsViewer.status === 403 && !movementsAsViewer.raw.includes(MAGIC_MOVEMENT_NOTE) && !movementsAsViewer.raw.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${movementsAsViewer.status}`,
    );
    const historyAsViewer = await getHtml("/gestion-ssjblue/inventario/movimientos", viewerCookie);
    record(
      "viewer: la página de historial redirige manualmente sin HTML/RSC sensible",
      historyAsViewer.status >= 300 && historyAsViewer.status < 400 && Boolean(historyAsViewer.location) && !historyAsViewer.html.includes(MAGIC_MOVEMENT_NOTE) && !historyAsViewer.html.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${historyAsViewer.status} location=${historyAsViewer.location}`,
    );

    // HTML/RSC real de la página de Inventario (no solo la API).
    const inventarioAsSuperadmin = await getHtml("/gestion-ssjblue/inventario", superadminCookie);
    record(
      "superadmin: el HTML real de /gestion-ssjblue/inventario SÍ contiene el costo sintético (confirma que la página normalmente lo muestra)",
      inventarioAsSuperadmin.status === 200 && inventarioAsSuperadmin.html.includes(MAGIC_COST),
      `status=${inventarioAsSuperadmin.status}`,
    );
    const inventarioAsViewer = await getHtml("/gestion-ssjblue/inventario", viewerCookie);
    record(
      "viewer: /gestion-ssjblue/inventario responde 200 real con el nombre del producto visible (no una página vacía/caída)",
      inventarioAsViewer.status === 200 && inventarioAsViewer.html.includes("Synth Sensitive 8B2"),
      `status=${inventarioAsViewer.status}`,
    );
    record(
      "viewer: el HTML real de /gestion-ssjblue/inventario NO contiene costPrice ni wholesalePrice sintéticos en ningún lado del documento (RSC incluido, no solo el DOM visible)",
      !inventarioAsViewer.html.includes(MAGIC_COST) &&
        !inventarioAsViewer.html.includes(MAGIC_WHOLESALE) &&
        !inventarioAsViewer.html.includes(MAGIC_SUPPLIER_COST) &&
      !inventarioAsViewer.html.includes(MAGIC_SUPPLIER_NAME) &&
        !inventarioAsViewer.html.includes(supplierId) &&
        !inventarioAsViewer.html.includes(MAGIC_MOVEMENT_NOTE) &&
        !inventarioAsViewer.html.includes(MAGIC_MOVEMENT_ADMIN) &&
        !inventarioAsViewer.html.includes("Ver movimientos"),
      "grep de substring sobre el HTML completo, incluye los payloads de RSC embebidos",
    );

    const productsAsVendedor = await getJson(`/api/admin/products/${productId}`, vendedorCookie);
    record(
      "vendedor no puede usar la API administrativa de productos como atajo al inventario",
      productsAsVendedor.status === 403 && !productsAsVendedor.raw.includes(MAGIC_WHOLESALE),
      `status=${productsAsVendedor.status}`,
    );
    const movementsAsVendedor = await getJson("/api/admin/inventory/movements", vendedorCookie);
    record(
      "vendedor: GET /api/admin/inventory/movements da 403 y no entrega el movimiento sensible",
      movementsAsVendedor.status === 403 && !movementsAsVendedor.raw.includes(MAGIC_MOVEMENT_NOTE) && !movementsAsVendedor.raw.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${movementsAsVendedor.status}`,
    );
    const historyAsVendedor = await getHtml("/gestion-ssjblue/inventario/movimientos", vendedorCookie);
    record(
      "vendedor: la página de historial redirige manualmente sin HTML/RSC sensible",
      historyAsVendedor.status >= 300 && historyAsVendedor.status < 400 && Boolean(historyAsVendedor.location) && !historyAsVendedor.html.includes(MAGIC_MOVEMENT_NOTE) && !historyAsVendedor.html.includes(MAGIC_MOVEMENT_ADMIN),
      `status=${historyAsVendedor.status} location=${historyAsVendedor.location}`,
    );
    const inventarioAsVendedor = await getHtml("/gestion-ssjblue/inventario", vendedorCookie);
    record(
      "vendedor recibe 200 real con identidad, precio mayorista, talla y cantidad necesarios para vender",
      inventarioAsVendedor.status === 200 &&
        inventarioAsVendedor.html.includes("Synth Sensitive 8B2") &&
        inventarioAsVendedor.html.includes(MAGIC_WHOLESALE) &&
        inventarioAsVendedor.html.includes("M") &&
        inventarioAsVendedor.html.includes("5"),
      `status=${inventarioAsVendedor.status}`,
    );
    record(
      "vendedor no recibe costos ni identidad/datos del proveedor en HTML/RSC",
      !inventarioAsVendedor.html.includes(MAGIC_COST) &&
        !inventarioAsVendedor.html.includes(MAGIC_SUPPLIER_COST) &&
        !inventarioAsVendedor.html.includes(MAGIC_SUPPLIER_NAME) &&
        !inventarioAsVendedor.html.includes(supplierId),
      "grep de valores sensibles sobre HTML completo",
    );

    const movementsWithoutSession = await getJson("/api/admin/inventory/movements");
    record(
      "sin sesión: GET /api/admin/inventory/movements da 401 (no redirige ni entrega historial)",
      movementsWithoutSession.status === 401 && !movementsWithoutSession.raw.includes(MAGIC_MOVEMENT_NOTE),
      `status=${movementsWithoutSession.status}`,
    );

    // Clientes: acceso TODO o NADA (viewer no tiene customers.read en absoluto).
    const customersAsSuperadmin = await getJson("/api/admin/customers", superadminCookie);
    record(
      "superadmin ve el cliente sintético por API",
      customersAsSuperadmin.status === 200 && customersAsSuperadmin.raw.includes(MAGIC_PHONE),
      `status=${customersAsSuperadmin.status}`,
    );
    const customersAsViewer = await getJson("/api/admin/customers", viewerCookie);
    record(
      "viewer: GET /api/admin/customers da 403 (sin acceso al recurso, no una lectura parcial)",
      customersAsViewer.status === 403 && !customersAsViewer.raw.includes(MAGIC_PHONE),
      `status=${customersAsViewer.status}`,
    );
    const clientesPageAsViewer = await getHtml("/gestion-ssjblue/clientes", viewerCookie);
    record(
      "viewer: la página /gestion-ssjblue/clientes redirige (no renderiza) -- no es un 500 ni una tabla vacía con el dato igual presente en el RSC",
      clientesPageAsViewer.status >= 300 && clientesPageAsViewer.status < 400 && !clientesPageAsViewer.html.includes(MAGIC_PHONE),
      `status=${clientesPageAsViewer.status}`,
    );

    // Proveedores: viewer sin acceso en absoluto; editor con lectura pero sin escritura.
    const suppliersAsViewer = await getJson("/api/admin/suppliers", viewerCookie);
    record(
      "viewer: GET /api/admin/suppliers da 403",
      suppliersAsViewer.status === 403 && !suppliersAsViewer.raw.includes(MAGIC_SUPPLIER_NAME),
      `status=${suppliersAsViewer.status}`,
    );
    const suppliersAsEditor = await getJson("/api/admin/suppliers", editorCookie);
    record(
      "editor: GET /api/admin/suppliers da 200 y SÍ ve el nombre del proveedor (suppliers.read)",
      suppliersAsEditor.status === 200 && suppliersAsEditor.raw.includes(MAGIC_SUPPLIER_NAME),
      `status=${suppliersAsEditor.status}`,
    );

    // Panel principal: no debe filtrar ingresos/ganancia a viewer (ver
    // app/gestion-ssjblue/(protected)/page.tsx, Fase 8B.2).
    const dashboardAsViewer = await getHtml("/gestion-ssjblue", viewerCookie);
    record(
      "viewer: /gestion-ssjblue (panel) responde 200 real (con el conteo de productos visible)",
      dashboardAsViewer.status === 200 && /Productos totales/.test(dashboardAsViewer.html),
      `status=${dashboardAsViewer.status}`,
    );
    record(
      "viewer: /gestion-ssjblue NO contiene 'Vendido este mes' ni 'Ganancia este mes' (sales.read ausente)",
      !/Vendido este mes/.test(dashboardAsViewer.html) && !/Ganancia este mes/.test(dashboardAsViewer.html),
      "grep sobre el HTML completo del panel",
    );
  } catch (error) {
    originalError = error;
    throw error;
  } finally {
    try {
      await teardown();
    } catch (cleanupError) {
      if (originalError) {
        console.error("La limpieza del fixture también falló; se conserva el error original:", cleanupError);
      } else {
        throw cleanupError;
      }
    }
  }

  console.log("\n== Resumen ==");
  const pass = results.filter((r) => r.pass).length;
  console.log(`${pass}/${results.length} OK`);
  if (pass !== results.length) {
    for (const r of results) if (!r.pass) console.log(`  - ${r.scenario} :: ${r.notes}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
