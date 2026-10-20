"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hasOptOutCookie } from "@/lib/opt-out";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Dispara un evento estándar del Pixel (AddToCart, ViewContent, Contact,
 * InitiateCheckout...) si el script ya cargó y el visitante no tiene la
 * cookie de opt-out (ver lib/opt-out.ts, compartida con Vercel Analytics).
 * No-op silencioso si el Pixel no está configurado -- así el resto del
 * código puede llamarla siempre, sin chequear antes si existe. */
export function trackPixelEvent(name: string, params?: Record<string, unknown>) {
  if (!PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  if (hasOptOutCookie()) return;
  window.fbq("track", name, params);
}

/** El script base ya dispara el primer PageView (ver MetaPixel). Este
 * componente solo cubre las navegaciones siguientes, que en el App Router
 * no recargan la página y por lo tanto no re-ejecutan ese script. */
function PixelRouteChangeTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackPixelEvent("PageView");
  }, [pathname]);

  return null;
}

export function MetaPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel de 1x1, no una imagen de contenido */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <PixelRouteChangeTracker />
    </>
  );
}
