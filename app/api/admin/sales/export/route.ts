import { NextRequest, NextResponse } from "next/server";
import { DataError, getSales } from "@/lib/data";
import { lineProfit, SALE_CHANNELS } from "@/lib/catalog";

const channelLabel = (value: string) =>
  SALE_CHANNELS.find((c) => c.value === value)?.label ?? value;

const dateTimeFormatter = new Intl.DateTimeFormat("es-PY", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADERS = [
  "Fecha",
  "Producto",
  "Talla",
  "Cantidad",
  "Precio compra",
  "Precio venta",
  "Ganancia",
  "Canal",
  "Vendedor",
  "Nota",
];

// BOM UTF-8: sin esto, Excel abre el CSV interpretando mal los acentos.
const UTF8_BOM = String.fromCharCode(0xfeff);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from") ?? undefined;
    const toDate = searchParams.get("to") ?? fromDate;

    const sales = await getSales({
      from: fromDate ? `${fromDate}T00:00:00` : undefined,
      to: toDate ? `${toDate}T23:59:59` : undefined,
    });

    const rows = sales.flatMap((sale) =>
      sale.items.map((item) => [
        dateTimeFormatter.format(new Date(sale.soldAt)),
        item.name,
        item.size,
        String(item.quantity),
        String(item.costPrice),
        String(item.unitPrice),
        String(lineProfit(item)),
        channelLabel(sale.channel),
        sale.staffName ?? "",
        sale.customerNote ?? "",
      ]),
    );

    const csv =
      UTF8_BOM +
      [HEADERS, ...rows]
        .map((row) => row.map((cell) => csvEscape(cell)).join(","))
        .join("\r\n");

    const filename = `ventas_${fromDate ?? "todas"}_${toDate ?? "todas"}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "No se pudo generar el archivo de ventas." },
      { status: 500 },
    );
  }
}
