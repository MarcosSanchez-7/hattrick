"use client";

import { useEffect, useState } from "react";

type Parts = { d: string; h: string; m: string; s: string };

const PLACEHOLDER: Parts = { d: "--", h: "--", m: "--", s: "--" };

/** Fin de campaña: el próximo domingo a las 23:59 (hora local del visitante). */
function campaignEnd(now: Date) {
  const end = new Date(now);
  const daysToSunday = (7 - now.getDay()) % 7 || 7;
  end.setDate(now.getDate() + daysToSunday);
  end.setHours(23, 59, 59, 0);
  return end;
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

export function Countdown() {
  // Se calcula sólo en cliente para no romper la hidratación.
  const [parts, setParts] = useState<Parts>(PLACEHOLDER);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = campaignEnd(now).getTime() - now.getTime();
      const secs = Math.max(0, Math.floor(diff / 1000));
      setParts({
        d: pad(Math.floor(secs / 86400)),
        h: pad(Math.floor((secs % 86400) / 3600)),
        m: pad(Math.floor((secs % 3600) / 60)),
        s: pad(secs % 60),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const units: [string, string][] = [
    [parts.d, "Días"],
    [parts.h, "Horas"],
    [parts.m, "Min"],
    [parts.s, "Seg"],
  ];

  return (
    <div className="countdown" aria-label="Tiempo restante de la promoción">
      {units.map(([value, label]) => (
        <div key={label} className="countdown__unit">
          <div className="countdown__num">{value}</div>
          <div className="countdown__label">{label}</div>
        </div>
      ))}
    </div>
  );
}
