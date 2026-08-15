"use client";

// TEMPORAL: diagnóstico visual de desborde horizontal en /carrito. Se borra
// en cuanto encontremos la causa real en el celular del dueño — no es una
// feature, es un instrumento de una sola vez.
import { useEffect, useState } from "react";

export function DebugOverflow() {
  const [info, setInfo] = useState<string>("midiendo…");

  useEffect(() => {
    const measure = () => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      const dpr = window.devicePixelRatio;
      const diff = docWidth - winWidth;

      let widest = { tag: "", cls: "", right: 0, width: 0 };
      document.querySelectorAll("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > winWidth + 1 && r.width > 0 && r.right > widest.right) {
          widest = {
            tag: el.tagName,
            cls: (el.className && typeof el.className === "string"
              ? el.className
              : ""
            ).slice(0, 40),
            right: Math.round(r.right),
            width: Math.round(r.width),
          };
        }
      });

      setInfo(
        `doc:${docWidth} win:${winWidth} dpr:${dpr} diff:${diff} | ` +
          (widest.tag
            ? `culpable: <${widest.tag} class="${widest.cls}"> right=${widest.right}`
            : "sin desborde detectado"),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        background: "#ff0",
        color: "#000",
        fontSize: "11px",
        fontFamily: "monospace",
        padding: "6px 8px",
        wordBreak: "break-all",
        borderBottom: "2px solid red",
      }}
    >
      {info}
    </div>
  );
}
