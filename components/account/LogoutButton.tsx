"use client";

import { signOut } from "@/app/(store)/cuenta/actions";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="btn btn--ghost btn--sm">
        Cerrar sesión
      </button>
    </form>
  );
}
