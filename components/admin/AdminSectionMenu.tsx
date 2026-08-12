"use client";

import { useState } from "react";
import Link from "next/link";
import { IconMenu } from "@/components/ui/Icons";

type MenuLink = {
  href: string;
  label: string;
};

export function AdminSectionMenu({ links }: { links: MenuLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-section-menu">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMenu className="icon--sm" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="admin-section-menu__backdrop"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div className="admin-section-menu__panel">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="admin-section-menu__item"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
