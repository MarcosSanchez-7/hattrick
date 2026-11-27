// Fase 8B.2 -- cobertura ESTRUCTURAL de autorización en app/api/admin/**.
// Corre con: node --test lib/admin-route-coverage.test.ts
//
// No es una búsqueda de texto: parsea cada route.ts con el compilador real
// de TypeScript y exige que cada método HTTP exportado (GET/POST/PUT/
// PATCH/DELETE) empiece con una llamada a requireAdminPermission()/
// requireAnyAdmin() (o esté envuelto en withAdminPermission()) CUYO
// RESULTADO se revise con un `if` que termine en `return` -- un import sin
// usar, o una llamada cuyo resultado nunca se chequea, no pasa esta
// prueba. Eso es justo lo que una búsqueda de texto ("¿aparece la palabra
// requireAdminPermission en el archivo?") no puede distinguir -- ver el
// hallazgo original de 8A: hasPermission() existía en el código y nunca se
// invocaba en ningún lado, así que un grep de "¿existe esta palabra?"
// habría aprobado ese estado roto igual.
//
// Enumera los archivos reales del disco (nunca una lista fija) -- un
// endpoint nuevo que se olvide de protegerse hace fallar esta prueba sin
// que nadie tenga que acordarse de agregarlo a ningún lado.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "..");
const ADMIN_API_DIR = path.join(ROOT, "app", "api", "admin");
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const AUTH_CALL_NAMES = new Set(["requireAdminPermission", "requireAnyAdmin"]);
const WRAPPER_CALL_NAMES = new Set(["withAdminPermission"]);

/**
 * Único lugar de excepciones públicas/técnicas, con su justificación --
 * lista cerrada, no un comodín. Si alguien le agrega un método nuevo a uno
 * de estos archivos (ej. un GET a login/route.ts), esta prueba lo exige
 * protegido salvo que también se agregue acá a mano, a propósito.
 */
const PUBLIC_EXCEPTIONS: Record<string, { methods: Set<string>; reason: string }> = {
  "login/route.ts": {
    methods: new Set(["POST"]),
    reason: "pre-sesión por diseño -- es el propio endpoint que la crea; protegido por proxy.ts (rate limit estricto) y verifyAdminCredentials().",
  },
  "logout/route.ts": {
    methods: new Set(["POST"]),
    reason: "debe poder limpiar una cookie inválida/vencida -- no tiene nada que proteger (no lee ni escribe datos de negocio).",
  },
  "setup/route.ts": {
    methods: new Set(["POST"]),
    reason: "bootstrap inicial -- se autoprotege exigiendo que getAdminUserCount() sea 0 y, si está configurado, SETUP_TOKEN; no puede exigir una sesión porque todavía no existe ningún admin.",
  },
};

function findRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findRouteFiles(full));
    else if (entry.isFile() && entry.name === "route.ts") out.push(full);
  }
  return out;
}

function callName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text;
  return null;
}

/** ¿El cuerpo de la función tiene, en algún punto, una llamada reconocida
 * (await requireAdminPermission(...) / requireAnyAdmin()) guardada por un
 * `if` que contenga `return` en su rama? No exige que sea LA PRIMERA
 * línea (algunos archivos desestructuran `{ params }` antes), pero sí que
 * exista como sentencia real del cuerpo, no dentro de un comentario ni de
 * un string. */
function bodyHasGuardedAuthCall(body: ts.Block): boolean {
  let foundCall = false;
  let foundGuardAfterCall = false;

  const statements = body.statements;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    let isAuthCallStatement = false;

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        let init = decl.initializer;
        if (init && ts.isAwaitExpression(init)) init = init.expression;
        if (init && ts.isCallExpression(init)) {
          const name = callName(init.expression);
          if (name && AUTH_CALL_NAMES.has(name)) isAuthCallStatement = true;
        }
      }
    } else if (ts.isExpressionStatement(stmt)) {
      let expr = stmt.expression;
      if (ts.isAwaitExpression(expr)) expr = expr.expression;
      if (ts.isCallExpression(expr)) {
        const name = callName(expr.expression);
        if (name && AUTH_CALL_NAMES.has(name)) isAuthCallStatement = true;
      }
    }

    if (isAuthCallStatement) {
      foundCall = true;
      // Busca un `if` de guarda entre ESTA sentencia y el final del
      // cuerpo (no exige que sea la siguiente inmediata -- requireAnyAdmin
      // en heartbeat, por ejemplo, está seguida de un comentario/otra
      // sentencia intermedia en algunos archivos).
      for (let j = i + 1; j < statements.length; j++) {
        const next = statements[j];
        if (ts.isIfStatement(next)) {
          const text = next.getFullText();
          const mentionsError = text.includes(".error") || text.includes('"error" in');
          const thenHasReturn =
            ts.isBlock(next.thenStatement)
              ? next.thenStatement.statements.some((s) => ts.isReturnStatement(s))
              : ts.isReturnStatement(next.thenStatement);
          if (mentionsError && thenHasReturn) {
            foundGuardAfterCall = true;
          }
          break;
        }
      }
      break;
    }
  }

  return foundCall && foundGuardAfterCall;
}

/** Patrón alternativo: `export const POST = withAdminPermission("x", async (...) => {...});` */
function isWrappedExport(node: ts.Node): boolean {
  if (!ts.isVariableStatement(node)) return false;
  return node.declarationList.declarations.some((decl) => {
    if (!decl.initializer || !ts.isCallExpression(decl.initializer)) return false;
    const name = callName(decl.initializer.expression);
    return Boolean(name && WRAPPER_CALL_NAMES.has(name));
  });
}

type Finding = { file: string; method: string; protected: boolean };

type ExpectedGuard = { kind: "permission"; permission: string } | { kind: "any" };

/** Matriz cerrada de las 73 operaciones protegidas. No se infiere del
 * nombre que el handler eligió: una ruta o método nuevo sin clasificación
 * falla antes de que pueda quedar cubierto por una regla comodín. */
function expectedGuard(rel: string, method: string): ExpectedGuard | null {
  if (PUBLIC_EXCEPTIONS[rel]?.methods.has(method)) return null;
  if (rel === "heartbeat/route.ts") return { kind: "any" };
  if (rel === "inventory/movements/route.ts" && method === "GET") {
    return { kind: "permission", permission: "inventory.movements.read" };
  }
  if (rel.startsWith("finance/")) return { kind: "permission", permission: "finance.access" };
  if (rel.startsWith("upload/")) return { kind: "permission", permission: "uploads.write" };
  if (rel.startsWith("users/")) return { kind: "permission", permission: "users.manage" };
  if (rel.startsWith("settings/")) return { kind: "permission", permission: "settings.write" };
  if (rel === "sales/export/route.ts") return { kind: "permission", permission: "sales.export" };
  if (rel === "sales/import/route.ts") return { kind: "permission", permission: "sales.import" };

  const resource = rel.split("/")[0];
  const permissions: Record<string, { read: string; write: string }> = {
    categories: { read: "categories.read", write: "categories.write" },
    customers: { read: "customers.read", write: "customers.write" },
    "inventory": { read: "inventory.read", write: "inventory.write" },
    pages: { read: "pages.read", write: "pages.write" },
    patches: { read: "patches.read", write: "patches.write" },
    products: { read: "products.read", write: "products.write" },
    "qr-campaigns": { read: "qr.read", write: "qr.write" },
    sales: { read: "sales.read", write: "sales.write" },
    suppliers: { read: "suppliers.read", write: "suppliers.write" },
    tags: { read: "tags.read", write: "tags.write" },
  };
  const permission = permissions[resource];
  if (!permission) return null;
  return { kind: "permission", permission: method === "GET" ? permission.read : permission.write };
}

function authCallInBody(body: ts.Block): { name: string; permission?: string } | null {
  for (const stmt of body.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      let init = decl.initializer;
      if (init && ts.isAwaitExpression(init)) init = init.expression;
      if (!init || !ts.isCallExpression(init)) continue;
      const name = callName(init.expression);
      if (!name || !AUTH_CALL_NAMES.has(name)) continue;
      const argument = init.arguments[0];
      return {
        name,
        permission: argument && ts.isStringLiteral(argument) ? argument.text : undefined,
      };
    }
  }
  return null;
}

function analyzeFile(filePath: string): Finding[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const findings: Finding[] = [];

  for (const stmt of sf.statements) {
    // export async function GET(...) { ... }
    if (
      ts.isFunctionDeclaration(stmt) &&
      stmt.name &&
      HTTP_METHODS.has(stmt.name.text) &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const method = stmt.name.text;
      const ok = stmt.body ? bodyHasGuardedAuthCall(stmt.body) : false;
      findings.push({ file: filePath, method, protected: ok });
      continue;
    }

    // export const POST = withAdminPermission(...) / requireAdminPermission wrapped
    if (
      ts.isVariableStatement(stmt) &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && HTTP_METHODS.has(decl.name.text)) {
          const method = decl.name.text;
          const ok = isWrappedExport(stmt);
          findings.push({ file: filePath, method, protected: ok });
        }
      }
    }
  }

  return findings;
}

test("todo endpoint administrativo exporta un método HTTP con autorización verificada o está en la lista cerrada de excepciones", () => {
  const files = findRouteFiles(ADMIN_API_DIR);
  // Si esto alguna vez da 0, el glob se rompió -- fallar fuerte en vez de
  // aprobar una prueba que no revisó nada.
  assert.equal(files.length, 40, `inventario de rutas cambió: se esperaban 40 archivos route.ts, se encontraron ${files.length}`);

  const violations: string[] = [];
  let totalMethods = 0;

  for (const file of files) {
    const rel = path.relative(ADMIN_API_DIR, file).replace(/\\/g, "/");
    const exception = PUBLIC_EXCEPTIONS[rel];
    const findings = analyzeFile(file);
    assert.ok(findings.length > 0, `${rel}: no se encontró ningún método HTTP exportado (GET/POST/PUT/PATCH/DELETE) -- revisar el patrón de export`);

    for (const f of findings) {
      totalMethods++;
      const isExcepted = exception?.methods.has(f.method) ?? false;
      if (isExcepted) continue;
      const expected = expectedGuard(rel, f.method);
      assert.ok(expected, `${rel} :: ${f.method}: operación protegida sin permiso esperado en la matriz cerrada`);
      if (!f.protected) {
        violations.push(`${rel} :: ${f.method}`);
      }

      const source = fs.readFileSync(file, "utf8");
      const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const handler = sf.statements.find(
        (stmt): stmt is ts.FunctionDeclaration =>
          ts.isFunctionDeclaration(stmt) && stmt.name?.text === f.method,
      );
      const guard = handler?.body ? authCallInBody(handler.body) : null;
      assert.ok(guard, `${rel} :: ${f.method}: no se encontró la llamada de autorización que consume el handler`);
      if (expected.kind === "any") {
        assert.equal(guard.name, "requireAnyAdmin", `${rel} :: ${f.method}: debe usar requireAnyAdmin()`);
      } else {
        assert.equal(guard.name, "requireAdminPermission", `${rel} :: ${f.method}: debe usar requireAdminPermission()`);
        assert.equal(guard.permission, expected.permission, `${rel} :: ${f.method}: permiso incorrecto`);
      }
    }
  }

  // Confirma que la lista de excepciones es exactamente la esperada -- si
  // alguien le agrega una entrada nueva sin que corresponda a uno de los
  // tres archivos ya conocidos, esto también debe hacer ruido.
  const exceptionFiles = Object.keys(PUBLIC_EXCEPTIONS);
  assert.deepStrictEqual(
    exceptionFiles.sort(),
    ["login/route.ts", "logout/route.ts", "setup/route.ts"].sort(),
    "la lista de excepciones públicas cambió -- revisar a propósito, no por accidente",
  );

  assert.equal(totalMethods, 76, `inventario de métodos cambió: se esperaban 76, se encontraron ${totalMethods}`);
  assert.equal(totalMethods - 3, 73, "deben quedar exactamente 73 métodos protegidos y 3 excepciones públicas explícitas");

  assert.deepStrictEqual(
    violations,
    [],
    `endpoints administrativos sin autorización verificable (llamada + guarda con return):\n${violations.join("\n")}`,
  );
});
