import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador, con la clave pública ("anon").
 * Hoy el único uso es ImageUploader.tsx, para subir directo a Storage con
 * un token firmado que ya emitió el servidor (createSignedUploadUrl) --
 * la anon key no otorga ningún permiso por sí sola en Storage, el bucket
 * "product-images" es público para lectura y las escrituras pasan siempre
 * por un token de un solo uso emitido server-side con la service_role key.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno.",
  );
}

export const supabaseBrowser = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
