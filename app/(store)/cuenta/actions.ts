"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/serverClient";
import { translateAuthError } from "@/lib/auth-errors";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type AuthFormState = { error: string | null };

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "Ingresá tu nombre." };
  if (!email) return { error: "Ingresá tu correo." };
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: translateAuthError(error.message) };

  // Supabase no devuelve error si el correo ya existe y está confirmado
  // (diseño anti-enumeración): en ese caso devuelve un user con
  // identities: [] en vez de crear una cuenta nueva.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      error:
        "Ese correo ya tiene una cuenta. Iniciá sesión o restablecé tu contraseña.",
    };
  }

  redirect(`/cuenta/revisa-tu-correo?email=${encodeURIComponent(email)}`);
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Completá correo y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: translateAuthError(error.message) };

  redirect("/cuenta");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
