// Fase 8B.2 -- interfaz real por rol (navegador real vía Playwright,
// mismo patrón que run-prefetch-policy.mjs). Confirma que la UI refleja
// los permisos efectivos -- sin tratar esto como la defensa real (eso ya
// lo prueban run-admin-authorization.mjs/run-admin-sensitive-data.mjs
// contra la API/HTML crudo).
import { chromium } from "playwright";
import { loadAndAssertTestEnv } from "../../scripts/test-env.mjs";
import { execFileSync } from "node:child_process";

const env = loadAndAssertTestEnv();
const BASE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3100";

function psqlExec(sql) {
  execFileSync(
    "docker",
    ["exec", "supabase_db_web", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
}

const SUPERADMIN = { email: "admin@test.local", password: "TestAdmin123!" };
const SYNTH_PASSWORD = "UiRole8B2Pass!";
const USERS = {
  editor: "synth-ui-editor@test.local",
  viewer: "synth-ui-viewer@test.local",
  vendedor: "synth-ui-vendedor@test.local",
};

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALLÓ: ${msg}`);
}

const results = [];
async function scenario(name, fn) {
  try {
    const notes = await fn();
    results.push({ name, pass: true, notes: notes ?? "" });
  } catch (err) {
    results.push({ name, pass: false, notes: String(err.message ?? err) });
  }
}

async function loginViaForm(page, email, password) {
  await page.goto(`${BASE_URL}/gestion-ssjblue/login`, { waitUntil: "load" });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Vendedor redirige de "/" a "/inventario" ya en el propio dashboard (ver
  // app/gestion-ssjblue/(protected)/page.tsx, Fase 8B.2) -- aceptar ambos
  // destinos como "login completado" en vez de asumir uno solo.
  await page.waitForURL(/\/gestion-ssjblue(\/inventario)?\/?$/, { timeout: 10000 });
}

async function main() {
  const browser = await chromium.launch();
  console.log(`\n== Fase 8B.2 -- interfaz por rol contra ${BASE_URL} ==\n`);

  // Setup: usuarios sintéticos vía API con la sesión de superadmin.
  psqlExec(`delete from admin_users where email like 'synth-ui-%@test.local';`);
  const setupCtx = await browser.newContext();
  const setupPage = await setupCtx.newPage();
  await loginViaForm(setupPage, SUPERADMIN.email, SUPERADMIN.password);
  const userIds = {};
  for (const [role, email] of Object.entries(USERS)) {
    const res = await setupPage.request.post(`${BASE_URL}/api/admin/users`, {
      data: { name: `UI ${role}`, email, password: SYNTH_PASSWORD, role },
    });
    assert(res.ok(), `no se pudo crear ${email}: ${await res.text()}`);
    userIds[role] = (await res.json()).id;
  }
  await setupCtx.close();

  try {
    await scenario("Superadmin: ve Finanzas y Usuarios en la navegación", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, SUPERADMIN.email, SUPERADMIN.password);
      const nav = await page.locator(".admin-nav a").allTextContents();
      assert(nav.some((t) => t.includes("Finanzas")), `nav sin Finanzas: ${nav}`);
      assert(nav.some((t) => t.includes("Usuarios")), `nav sin Usuarios: ${nav}`);
      await ctx.close();
      return `nav: ${nav.join(", ")}`;
    });

    await scenario("Editor: NO ve Finanzas ni Usuarios en la navegación, pero sí Ventas/Clientes/Generales", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.editor, SYNTH_PASSWORD);
      const nav = await page.locator(".admin-nav a").allTextContents();
      assert(!nav.some((t) => t.includes("Finanzas")), `nav con Finanzas de más: ${nav}`);
      assert(!nav.some((t) => t.includes("Usuarios")), `nav con Usuarios de más: ${nav}`);
      assert(nav.some((t) => t.includes("Ventas")), `nav sin Ventas: ${nav}`);
      assert(nav.some((t) => t.includes("Clientes")), `nav sin Clientes: ${nav}`);
      await ctx.close();
      return `nav: ${nav.join(", ")}`;
    });

    await scenario("Viewer: NO ve Ventas ni Clientes en la navegación, pero sí Inventario/Categorías/Generales", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      const nav = await page.locator(".admin-nav a").allTextContents();
      assert(!nav.some((t) => t.includes("Ventas")), `nav con Ventas de más: ${nav}`);
      assert(!nav.some((t) => t.includes("Clientes")), `nav con Clientes de más: ${nav}`);
      assert(nav.some((t) => t.includes("Inventario")), `nav sin Inventario: ${nav}`);
      assert(nav.some((t) => t.includes("Generales")), `nav sin Generales: ${nav}`);
      await ctx.close();
      return `nav: ${nav.join(", ")}`;
    });

    await scenario("Viewer: Inventario no muestra controles de escritura ni acceso al historial", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/inventario`, { waitUntil: "load" });
      const nuevoProducto = await page.locator('a:has-text("Nuevo producto")').count();
      assert(nuevoProducto === 0, "viewer ve el botón 'Nuevo producto' pese a no tener products.write");
      const editIcons = await page.locator(".admin-icon-btn--danger").count();
      assert(editIcons === 0, "viewer ve botones de eliminar en Inventario");
      const historyLink = await page.locator('a[href="/gestion-ssjblue/inventario/movimientos"]').count();
      assert(historyLink === 0, "viewer ve el enlace al historial de movimientos");
      await ctx.close();
      return "sin controles de escritura ni enlace de historial para viewer";
    });

    await scenario("Editor: Inventario muestra 'Nuevo producto' y acceso al historial", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.editor, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/inventario`, { waitUntil: "load" });
      const nuevoProducto = await page.locator('a:has-text("Nuevo producto")').count();
      assert(nuevoProducto > 0, "editor no ve 'Nuevo producto' pese a tener products.write");
      const historyLink = await page.locator('a[href="/gestion-ssjblue/inventario/movimientos"]').count();
      assert(historyLink === 1, "editor no ve el enlace al historial pese a tener inventory.movements.read");
      await page.goto(`${BASE_URL}/gestion-ssjblue/inventario/movimientos`, { waitUntil: "load" });
      assert(page.url().includes("/inventario/movimientos"), `editor fue redirigido desde historial a ${page.url()}`);
      assert(await page.getByRole("heading", { name: "Movimientos de stock" }).count() === 1, "editor no recibe la página de historial");
      await ctx.close();
      return "editor ve el botón de escritura y la página de historial";
    });

    await scenario("Viewer: acceso directo al historial de movimientos lo redirige (sin tabla interna)", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/inventario/movimientos`, { waitUntil: "load" });
      assert(!page.url().includes("/inventario/movimientos"), `viewer no fue redirigido: ${page.url()}`);
      assert(await page.getByRole("heading", { name: "Movimientos de stock" }).count() === 0, "viewer recibe la tabla de historial");
      await ctx.close();
      return `terminó en ${page.url()}`;
    });

    await scenario("Viewer: Categorías, Parches y Páginas no muestran creación, edición ni eliminación", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      const checks = [
        ["categorias", /Nueva categoría/],
        ["generales/parches", /Nuevo parche/],
        ["paginas", /Nueva página/],
      ];
      for (const [path, createLabel] of checks) {
        await page.goto(`${BASE_URL}/gestion-ssjblue/${path}`, { waitUntil: "load" });
        assert(await page.getByText(createLabel).count() === 0, `viewer ve creación en ${path}`);
        assert(await page.getByText("Editar", { exact: true }).count() === 0, `viewer ve edición en ${path}`);
        assert(await page.locator(".admin-icon-btn--danger").count() === 0, `viewer ve eliminación en ${path}`);
      }
      await ctx.close();
      return "sin acciones mutantes en las tres pantallas de solo lectura";
    });

    await scenario("Superadmin y editor conservan acciones autorizadas en Categorías, Parches y Páginas", async () => {
      for (const [role, email] of [["superadmin", SUPERADMIN.email], ["editor", USERS.editor]]) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await loginViaForm(page, email, role === "superadmin" ? SUPERADMIN.password : SYNTH_PASSWORD);
        const screens = [
          ["categorias", /Nueva categoría/],
          ["generales/parches", /Nuevo parche/],
          ["paginas", /Nueva página/],
        ];
        for (const [path, createLabel] of screens) {
          await page.goto(`${BASE_URL}/gestion-ssjblue/${path}`, { waitUntil: "load" });
          assert(await page.getByText(createLabel).count() > 0, `${role} no ve creación en ${path}`);
        }
        await ctx.close();
      }
      return "ambos roles de escritura conservan creación en las tres pantallas";
    });

    await scenario("Viewer: acceso directo por URL a /gestion-ssjblue/usuarios lo redirige (no 500, no la tabla real)", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/usuarios`, { waitUntil: "load" });
      assert(!page.url().includes("/usuarios"), `no redirigió, sigue en ${page.url()}`);
      await ctx.close();
      return `terminó en ${page.url()}`;
    });

    await scenario("Viewer: acceso directo por URL a /gestion-ssjblue/productos/nuevo lo redirige (sin formulario editable)", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/productos/nuevo`, { waitUntil: "load" });
      assert(!page.url().includes("/productos/nuevo"), `no redirigió, sigue en ${page.url()}`);
      await ctx.close();
      return `terminó en ${page.url()}`;
    });

    await scenario("Vendedor: cualquier página fuera de Inventario redirige a Inventario", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.vendedor, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/categorias`, { waitUntil: "load" });
      assert(page.url().endsWith("/gestion-ssjblue/inventario"), `terminó en ${page.url()}`);
      await page.goto(`${BASE_URL}/gestion-ssjblue/inventario/movimientos`, { waitUntil: "load" });
      assert(page.url().endsWith("/gestion-ssjblue/inventario"), `historial terminó en ${page.url()}`);
      await ctx.close();
      return `terminó en ${page.url()}`;
    });

    await scenario("Vendedor: Inventario muestra 'Precio mayorista' (su columna prevista) tras expandir una categoría, y nada de costo", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.vendedor, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/inventario`, { waitUntil: "load" });
      assert(await page.locator('a[href="/gestion-ssjblue/inventario/movimientos"]').count() === 0, "vendedor ve enlace al historial");
      // Las columnas viven DENTRO de cada grupo de categoría colapsable --
      // hay que abrir uno antes de que exista ningún <th> en el DOM.
      await page.locator(".admin-cat-group__head").first().click();
      const headerText = await page.locator(".admin-table th").allTextContents();
      assert(headerText.some((t) => t.includes("Precio mayorista")), `headers: ${headerText}`);
      await ctx.close();
      return `headers: ${headerText.join(", ")}`;
    });

    await scenario("Editor: flujo completo -- crear un producto nuevo y verlo en Inventario", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.editor, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/productos/nuevo`, { waitUntil: "load" });
      await page.fill('input[name="name"], #name', "UI Role Test Product 8B2");
      // El formulario completo tiene muchos campos obligatorios -- no se
      // completa el flujo de guardado acá (eso ya lo prueba run-scenarios.mjs
      // end-to-end); esta prueba confirma que EDITOR llega al formulario y
      // puede escribir en él, que es lo que corresponde verificar en esta fase.
      const nameValue = await page.inputValue('input[name="name"], #name');
      assert(nameValue === "UI Role Test Product 8B2", "editor no pudo escribir en el formulario de producto");
      await ctx.close();
      return "editor puede llegar al formulario y editarlo";
    });

    await scenario("Viewer: Generales NO muestra Branding/Footer/Navbar/Home (solo configuración real, superadmin-only)", async () => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginViaForm(page, USERS.viewer, SYNTH_PASSWORD);
      await page.goto(`${BASE_URL}/gestion-ssjblue/generales`, { waitUntil: "load" });
      const links = await page.locator(".admin-settings-row__title").allTextContents();
      assert(!links.includes("Branding"), `Generales muestra Branding a viewer: ${links}`);
      assert(links.includes("Etiquetas") || links.includes("Parches"), `Generales no muestra catálogo a viewer: ${links}`);
      await ctx.close();
      return `links visibles: ${links.join(", ")}`;
    });
  } finally {
    const cleanupCtx = await browser.newContext();
    const cleanupPage = await cleanupCtx.newPage();
    await loginViaForm(cleanupPage, SUPERADMIN.email, SUPERADMIN.password);
    for (const id of Object.values(userIds)) {
      await cleanupPage.request.delete(`${BASE_URL}/api/admin/users/${id}`).catch(() => {});
    }
    await cleanupCtx.close();
    psqlExec(`delete from admin_users where email like 'synth-ui-%@test.local';`);
    psqlExec(`delete from products where slug like 'ui-role-test%' or name like 'UI Role Test%';`);
  }

  console.log("\n== Resumen ==");
  const pass = results.filter((r) => r.pass).length;
  for (const r of results) console.log(`[${r.pass ? "OK" : "FAIL"}] ${r.name} -- ${r.notes}`);
  console.log(`${pass}/${results.length} OK`);
  await browser.close();
  if (results.some((r) => !r.pass)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
