"use client";

import { useState } from "react";
import { IconCheck } from "@/components/ui/Icons";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="newsletter">
      <div className="container newsletter__inner">
        <div>
          <span className="label" style={{ color: "var(--ink-muted)" }}>
            Lista de lanzamientos
          </span>
          <h2 className="h1" style={{ marginTop: 8 }}>
            Entérate antes que nadie
          </h2>
          <p className="lead" style={{ marginTop: 12 }}>
            Avisos de nuevas equipaciones, reediciones retro y acceso 24 h antes
            a las rebajas. Sin spam.
          </p>
        </div>

        {done ? (
          <div className="notice" style={{ background: "var(--surface)" }}>
            <IconCheck className="icon--sm" />
            <span>
              Listo. Te hemos enviado un correo de confirmación a{" "}
              <strong>{email}</strong>.
            </span>
          </div>
        ) : (
          <form
            className="field-inline"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Correo electrónico"
            />
            <button type="submit" className="btn">
              Suscribirme
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
