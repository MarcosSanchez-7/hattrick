"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/ui/Icons";

/**
 * <input type="password"> con botón de mostrar/ocultar (ojito) para poder
 * revisar lo que se escribió antes de guardar. Mismo componente para login,
 * alta inicial de admin y alta/edición de usuarios.
 */
export function PasswordInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="admin-password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="admin-password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <IconEyeOff className="icon--sm" /> : <IconEye className="icon--sm" />}
      </button>
    </div>
  );
}
