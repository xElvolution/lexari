import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-only service-role client. Never import from client components. */
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export const RENDERS_BUCKET = "renders";
export const RECEIPTS_BUCKET = "receipts";
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
