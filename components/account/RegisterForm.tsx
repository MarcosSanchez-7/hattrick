"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthFormState } from "@/app/(store)/cuenta/actions";

const initialState: AuthFormState = { error: null };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form className="account-form" action={formAction}>
      {state.error ? <p className="admin-error">{state.error}</p> : null}

      <div className="admin-field">
        <label htmlFor="fullName">Nombre completo</label>
        <input id="fullName" name="fullName" type="text" required autoComplete="name" />
      </div>
      <div className="admin-field">
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="admin-field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="admin-help">Mínimo 6 caracteres.</p>
      </div>

      <button type="submit" className="btn btn--block" disabled={isPending}>
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </button>

      <p className="meta" style={{ textAlign: "center", marginTop: 8 }}>
        ¿Ya tenés cuenta?{" "}
        <Link href="/cuenta/iniciar-sesion" className="link-underline">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
