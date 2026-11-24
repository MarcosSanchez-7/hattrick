"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import {
  FREE_SHIPPING_FROM,
  availableStock,
  deriveCartLines,
  useCart,
  type CartLine,
} from "@/components/cart/CartProvider";
import { ProductVisual } from "@/components/product/ProductVisual";
import { trackPixelEvent } from "@/components/analytics/MetaPixel";
import { LocationPicker, type LatLng } from "@/components/admin/LocationPicker";
import {
  IconBag,
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
  IconWhatsappBadge,
} from "@/components/ui/Icons";

type InvoiceInfo = {
  wantsInvoice: boolean;
  razonSocial: string;
  ruc: string;
};

/** Línea ya resuelta -- solo estas entran al mensaje de WhatsApp; lo que
 * sigue "pending" o quedó "unavailable" se excluye (igual que ya excluye el
 * subtotal, ver CartProvider.tsx) hasta que el cliente lo saque o se
 * resuelva. */
type ResolvedCartLine = CartLine & { product: NonNullable<CartLine["product"]> };

function isResolvedLine(line: CartLine): line is ResolvedCartLine {
  return line.product !== null;
}

function buildWhatsAppMessage(
  lines: ResolvedCartLine[],
  total: number,
  freeShipping: boolean,
  invoice: InvoiceInfo,
  location: LatLng,
): string {
  const items = lines
    .map((l) => {
      const base = `• ${l.product.name} (Talla ${l.size}) x${l.qty} — ${formatPrice(l.lineTotal)}`;
      const extras = [
        `   Ver producto: ${SITE_URL}/producto/${l.product.slug}`,
        l.note ? `   Personalizado: "${l.note}"` : null,
        l.patches?.length ? `   Parches: ${l.patches.map((p) => p.name).join(", ")}` : null,
      ].filter(Boolean);
      return `${base}\n${extras.join("\n")}`;
    })
    .join("\n");
  const locationLine = `Ubicación de entrega: https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const shippingLine = freeShipping
    ? "Envío: gratis"
    : "Envío: a coordinar según la zona";
  const invoiceLine = invoice.wantsInvoice
    ? `\n\nFactura: sí\nRazón social: ${invoice.razonSocial}\nRUC: ${invoice.ruc}`
    : "";
  return `¡Hola! Quiero comprar:\n${items}\n\n${locationLine}\n${shippingLine}\nTotal: ${formatPrice(total)}${invoiceLine}`;
}

export function CarritoView({ whatsappNumber }: { whatsappNumber: string }) {
  const {
    lines,
    storedLines,
    subtotal,
    freeShipping,
    total,
    count,
    setQty,
    remove,
    clear,
    hydrated,
    isResolving,
    resolveError,
    retryResolve,
    refreshPrices,
  } = useCart();

  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [validating, setValidating] = useState(false);

  // Verifica precio/stock vigentes una vez al entrar a /carrito (salta la
  // caché de CDN, ver refreshPrices en CartProvider.tsx) -- esto es una
  // verificación temprana/UX, no la que decide si se puede continuar: esa
  // se repite siempre al hacer click en "Continuar por WhatsApp" (ver
  // handleContinue más abajo), nunca solo acá.
  const refreshPricesRef = useRef(refreshPrices);
  refreshPricesRef.current = refreshPrices;
  useEffect(() => {
    refreshPricesRef.current();
  }, []);

  const hasUnavailable = lines.some((l) => l.status === "unavailable");

  const invoiceComplete = razonSocial.trim() !== "" && ruc.trim() !== "";
  const canCheckout =
    location !== null &&
    (!wantsInvoice || invoiceComplete) &&
    !isResolving &&
    !hasUnavailable &&
    !validating;

  const invoiceInfo: InvoiceInfo = {
    wantsInvoice,
    razonSocial: razonSocial.trim(),
    ruc: ruc.trim(),
  };

  /**
   * Única puerta real hacia WhatsApp -- se ejecuta SIEMPRE al hacer click,
   * no solo una vez al entrar a /carrito (el cliente puede quedarse un
   * rato completando ubicación/factura mientras el precio/stock cambia).
   * refreshPrices() devuelve los productos recién obtenidos directo (en
   * vez de depender de que el estado de React ya se haya re-renderizado,
   * ver CartProvider.tsx) y acá se recalculan las líneas con ESOS datos
   * frescos -- si algo ya no está disponible o la cantidad guardada superó
   * el stock vigente, se avisa y se bloquea en vez de excluirlo en
   * silencio del pedido.
   *
   * El wa.me se abre con window.open("", "_blank") ANTES del await (bajo
   * el gesto del click, para que el navegador no lo trate como popup) y
   * recién después se navega esa pestaña ya abierta -- abrir la pestaña
   * DESPUÉS de un await casi siempre lo bloquea un popup blocker.
   */
  async function handleContinue() {
    if (!whatsappNumber || !canCheckout) return;
    setValidating(true);
    // Sin "noopener" en las window features a propósito: ese flag hace que
    // window.open() devuelva null (es justamente lo que "noopener"
    // significa -- no darle al que abre una referencia a la nueva
    // ventana), lo que habría roto todo este patrón de "abrir en blanco
    // bajo el gesto del click, navegar recién al terminar de validar". La
    // protección equivalente (que wa.me no pueda tocar `window.opener` de
    // esta pestaña) se aplica más abajo con `tab.opener = null` ANTES de
    // navegarla a una URL externa, sin perder la referencia.
    const tab = window.open("", "_blank");
    // `opened` controla el `finally` de abajo: la pestaña en blanco debe
    // cerrarse en CUALQUIER salida que no termine en una navegación real a
    // wa.me -- no solo en los tres chequeos de abajo (red/no disponible/
    // stock), sino también ante una excepción inesperada que nadie previó,
    // para que nunca quede una pestaña huérfana ni `validating` trabado.
    let opened = false;

    try {
      const result = await refreshPrices();
      if (!result.ok) {
        toast.error("No pudimos confirmar el precio y el stock. Probá de nuevo.");
        return;
      }

      const freshMap = new Map(result.products.map((p) => [p.slug, p]));
      const freshLines = deriveCartLines(
        storedLines,
        (slug) => freshMap.get(slug),
        (slug) => !freshMap.has(slug),
      );
      const unavailableNow = freshLines.filter((l) => l.status === "unavailable");
      const overStock = freshLines.filter((l) => {
        if (!l.product) return false;
        const max = availableStock(l.product, l.size);
        return max != null && l.qty > max;
      });

      if (unavailableNow.length > 0) {
        toast.error(
          "Uno o más productos de tu carrito ya no están disponibles. Quitalos para continuar.",
        );
        return;
      }
      if (overStock.length > 0) {
        const names = overStock.map((l) => `${l.product!.name} (talla ${l.size})`).join(", ");
        toast.error(`Stock insuficiente para: ${names}. Ajustá la cantidad para continuar.`);
        return;
      }

      const resolvedFresh = freshLines.filter(isResolvedLine);
      const freshTotal = freshLines.reduce((acc, l) => acc + l.lineTotal, 0);
      const freshFreeShipping = freshTotal > 0 && freshTotal >= FREE_SHIPPING_FROM;
      const message = buildWhatsAppMessage(
        resolvedFresh,
        freshTotal,
        freshFreeShipping,
        invoiceInfo,
        location!,
      );
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      trackPixelEvent("InitiateCheckout", {
        content_ids: resolvedFresh.map((l) => l.product.id),
        num_items: resolvedFresh.reduce((acc, l) => acc + l.qty, 0),
        value: freshTotal,
        currency: "PYG",
      });

      if (tab) {
        // Corta la referencia inversa (wa.me no puede tocar `window.opener`
        // de esta pestaña) justo antes de mandarla a un dominio externo --
        // sin esto, perder el "noopener" de arriba sería un riesgo real de
        // tabnabbing.
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      opened = true;
    } finally {
      if (!opened) tab?.close();
      setValidating(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <div className="container">
          <nav className="breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Carrito</span>
          </nav>
          <h1 className="h1">Tu carrito</h1>
          <p className="lead" style={{ marginTop: 8 }}>
            {hydrated
              ? count === 0
                ? "Todavía no has añadido ninguna camiseta."
                : `${count} artículo${count > 1 ? "s" : ""} listos para coordinar por WhatsApp.`
              : "Cargando…"}
          </p>
        </div>
      </header>

      {hydrated && lines.length === 0 ? (
        <div className="container">
          <div className="empty-state">
            <IconBag />
            <h2 className="h2">El carrito está vacío</h2>
            <p className="meta" style={{ maxWidth: "44ch" }}>
              Explora los nuevos ingresos o aprovecha las ofertas de la semana.
            </p>
            <div className="row gap-3">
              <Link href="/novedades" className="btn btn--sm">
                Ver novedades
              </Link>
              <Link href="/ofertas" className="btn btn--ghost btn--sm">
                Ver ofertas
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="container cart-page">
          <div>
            {resolveError ? (
              <div className="row gap-3" style={{ marginBottom: "var(--sp-4)" }}>
                <span className="meta">No se pudo actualizar el carrito.</span>
                <button type="button" className="link-underline meta" onClick={retryResolve}>
                  Reintentar
                </button>
              </div>
            ) : null}

            {lines.map((line) => {
              if (!line.product) {
                return (
                  <div
                    key={line.key}
                    className="line-item"
                    style={{ gridTemplateColumns: "110px 1fr" }}
                  >
                    <div className="line-item__art">
                      {line.status === "pending" ? (
                        <div className="skeleton" style={{ width: "100%", height: "100%" }} />
                      ) : null}
                    </div>
                    <div>
                      <div className="line-item__top">
                        <div>
                          <span style={{ fontWeight: 600 }}>
                            {line.status === "pending" ? "Cargando…" : "Producto ya no disponible"}
                          </span>
                          <div className="meta">Talla {line.size}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(line.key)}
                          aria-label="Eliminar artículo"
                          style={{ color: "var(--ink-muted)" }}
                        >
                          <IconTrash className="icon--sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const max = availableStock(line.product, line.size);
              const atMax = max != null ? line.qty >= max : line.qty >= 10;
              return (
                <div
                  key={line.key}
                  className="line-item"
                  style={{ gridTemplateColumns: "110px 1fr" }}
                >
                  <div className="line-item__art">
                    <ProductVisual
                      images={line.product.images}
                      colors={line.product.colors}
                      pattern={line.product.pattern}
                      uid={`cart-${line.product.id}-${line.size}`}
                      alt={line.product.name}
                      size="thumb"
                    />
                  </div>
                  <div>
                    <div className="line-item__top">
                      <div>
                        <Link
                          href={`/producto/${line.product.slug}`}
                          style={{ fontWeight: 600 }}
                        >
                          {line.product.name}
                        </Link>
                        <div className="meta">Talla {line.size}</div>
                        {line.note ? (
                          <div className="meta">Personalizado: {line.note}</div>
                        ) : null}
                        {line.patches?.length ? (
                          <div className="meta">
                            Parches: {line.patches.map((p) => p.name).join(", ")}
                          </div>
                        ) : null}
                        {max === 0 ? (
                          <div className="meta" style={{ color: "var(--err, #b91c1c)" }}>
                            Agotado -- revisá antes de continuar
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        aria-label="Eliminar artículo"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        <IconTrash className="icon--sm" />
                      </button>
                    </div>
                    <div className="line-item__foot">
                      <div className="qty">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          aria-label="Restar unidad"
                        >
                          <IconMinus className="icon--sm" />
                        </button>
                        <span className="qty__value">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          disabled={atMax}
                          aria-label="Sumar unidad"
                        >
                          <IconPlus className="icon--sm" />
                        </button>
                      </div>
                      <span className="price">{formatPrice(line.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {lines.length > 0 ? (
              <div className="cart-actions-row">
                <Link href="/novedades" className="link-underline meta">
                  Seguir comprando
                </Link>
                <button type="button" className="link-underline meta" onClick={clear}>
                  Vaciar carrito
                </button>
              </div>
            ) : null}
          </div>

          <aside className="summary">
            <h2 className="label">Resumen del pedido</h2>
            <div className="totals">
              <div className="totals__row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="totals__row">
                <span>Envío</span>
                <span>
                  {freeShipping ? "Gratis" : "Costo adicional dependiendo la zona"}
                </span>
              </div>
              <div className="totals__row totals__row--total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <div className="stack gap-2">
              <label className="label">Ubicación de entrega (obligatorio)</label>
              <LocationPicker value={location} onChange={setLocation} height={220} />
            </div>

            <div className="invoice-toggle-row">
              <label className="invoice-toggle">
                <input
                  type="checkbox"
                  checked={wantsInvoice}
                  onChange={(e) => setWantsInvoice(e.target.checked)}
                />
                ¿Deseas factura?
              </label>

              {wantsInvoice ? (
                <div className="invoice-fields">
                  <div>
                    <label htmlFor="razonSocial">Razón social</label>
                    <input
                      id="razonSocial"
                      type="text"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div>
                    <label htmlFor="ruc">Número de RUC</label>
                    <input
                      id="ruc"
                      type="text"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      placeholder="80012345-6"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {whatsappNumber && canCheckout ? (
              <button type="button" className="btn btn--block" onClick={handleContinue} disabled={validating}>
                <IconWhatsappBadge className="icon--sm" />
                {validating ? "Verificando precio y stock…" : "Continuar por WhatsApp"}
              </button>
            ) : whatsappNumber && (isResolving || validating) ? (
              <p className="meta" style={{ textAlign: "center" }}>
                Verificando disponibilidad…
              </p>
            ) : whatsappNumber && hasUnavailable ? (
              <p className="meta" style={{ textAlign: "center" }}>
                Quitá los productos ya no disponibles para continuar.
              </p>
            ) : whatsappNumber && !location ? (
              <p className="meta" style={{ textAlign: "center" }}>
                Marcá tu ubicación en el mapa para continuar.
              </p>
            ) : whatsappNumber && wantsInvoice && !invoiceComplete ? (
              <p className="meta" style={{ textAlign: "center" }}>
                Completá razón social y RUC para continuar.
              </p>
            ) : (
              <p className="meta" style={{ textAlign: "center" }}>
                Escribinos por WhatsApp para coordinar tu compra.
              </p>
            )}

            <div className="stack gap-2">
              <div className="notice">
                <IconTruck className="icon--sm" />
                <span>
                  {freeShipping
                    ? `Envío gratuito a partir de ${formatPrice(FREE_SHIPPING_FROM)}`
                    : `Envío gratis desde ${formatPrice(FREE_SHIPPING_FROM)}. Por debajo de ese monto, nuestro asesor coordina el costo por WhatsApp según tu zona.`}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
