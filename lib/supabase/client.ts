import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente de Supabase para Client Components ("use client"). Usa la anon
 * key: queda sujeto a RLS real, nunca a la service_role de lib/supabase/server.ts.
 */
export function createClient() {
  return createBrowserClient(url, anonKey);
}
