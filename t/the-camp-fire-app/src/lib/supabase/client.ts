import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env " +
      "and fill in the values from your Supabase project's Settings > API page."
  );
}

/**
 * Tip: this is the one Supabase client for the whole app — every other
 * module (auth, campaigns, characters...) imports this instead of
 * creating its own client, so there's exactly one connection/session to
 * reason about.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
