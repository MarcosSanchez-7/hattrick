"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthFormState } from "@/app/(store)/cuenta/actions";

const initialState: AuthFormState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form className="account-form" action={formAction}>
      {state.error ? <p className="admin-error">{state.error}</p> : null}

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
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="btn btn--block" disabled={isPending}>
        {isPending ? "Ingresando…" : "Iniciar sesión"}
      </button>

      <p className="meta" style={{ textAlign: "center", marginTop: 8 }}>
        ¿No tenés cuenta?{" "}
        <Link href="/cuenta/registrarse" className="link-underline">
          Registrate
        </Link>
      </p>
    </form>
  );
}
