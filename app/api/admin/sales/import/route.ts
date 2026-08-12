import { NextRequest, NextResponse } from "next/server";
import { DataError, importHistoricalSales, type SaleImportRow } from "@/lib/data";
import { SALE_CHANNELS, type SaleChannel } from "@/lib/catalog";

/**
 * Parser de CSV a mano (sin librerías nuevas, simétrico con el export de
 * Ventas): soporta campos entre comillas con comas/comillas/saltos de línea
 * adentro, y salta el BOM UTF-8 que agrega nuestro propio export.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Acepta "dd/mm/yyyy[ hh:mm]" (como lo escribe una planilla es-PY) o ISO. */
function parseFecha(value: string): string | null {
  const v = value.trim();
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (m) {
    const [, d, mo, y, h, mi] = m;
    const date = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      h ? Number(h) : 12,
      mi ? Number(mi) : 0,
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const iso = new Date(v);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

/** "Gs. 100.000" / "100000" / "100.000" -> 100000. PYG no usa decimales. */
function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d-]/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

function parseChannel(value: string): SaleChannel | null {
  const v = value.trim().toLowerCase();
  const found = SALE_CHANNELS.find(
    (c) => c.label.toLowerCase() === v || c.value === v,
  );
  return found?.value ?? null;
}

const REQUIRED_HEADERS = [
  "fecha",
  "producto",
  "talla",
  "cantidad",
  "precio compra",
  "precio venta",
  "canal",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Subí un archivo CSV." }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "El archivo no tiene filas para importar." },
        { status: 400 },
      );
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);

    const missing = REQUIRED_HEADERS.filter((h) => col(h) === -1);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Faltan columnas en el CSV: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }

    const idx = {
      fecha: col("fecha"),
      producto: col("producto"),
      talla: col("talla"),
      cantidad: col("cantidad"),
      costo: col("precio compra"),
      venta: col("precio venta"),
      canal: col("canal"),
      vendedor: col("vendedor"),
      nota: col("nota"),
    };

    const parsed: SaleImportRow[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const rowNum = i + 1; // fila 1 = encabezado

      const fecha = parseFecha(cells[idx.fecha] ?? "");
      const producto = (cells[idx.producto] ?? "").trim();
      const talla = (cells[idx.talla] ?? "").trim();
      const cantidad = parseAmount(cells[idx.cantidad] ?? "");
      const costo = parseAmount(cells[idx.costo] ?? "");
      const venta = parseAmount(cells[idx.venta] ?? "");
      const canal = parseChannel(cells[idx.canal] ?? "");

      if (!fecha) {
        errors.push({ row: rowNum, message: "Fecha inválida." });
        continue;
      }
      if (!producto) {
        errors.push({ row: rowNum, message: "Falta el producto." });
        continue;
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        errors.push({ row: rowNum, message: "Cantidad inválida." });
        continue;
      }
      if (!Number.isFinite(venta) || venta < 0) {
        errors.push({ row: rowNum, message: "Precio de venta inválido." });
        continue;
      }
      if (!Number.isFinite(costo) || costo < 0) {
        errors.push({ row: rowNum, message: "Precio de costo inválido." });
        continue;
      }
      if (!canal) {
        errors.push({
          row: rowNum,
          message: 'Canal desconocido (usá "Tienda física", "WhatsApp", "Instagram" o "Web").',
        });
        continue;
      }

      parsed.push({
        soldAt: fecha,
        productName: producto,
        size: talla || "—",
        quantity: cantidad,
        unitPrice: venta,
        costPrice: costo,
        channel: canal,
        staffName: idx.vendedor >= 0 ? cells[idx.vendedor]?.trim() || null : null,
        note: idx.nota >= 0 ? cells[idx.nota]?.trim() || null : null,
      });
    }

    const result = await importHistoricalSales(parsed);
    return NextResponse.json({
      imported: result.imported,
      errors: [...errors, ...result.errors].sort((a, b) => a.row - b.row),
    });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo importar el archivo." },
      { status: 500 },
    );
  }
}
