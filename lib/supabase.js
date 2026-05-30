import { createClient } from "@supabase/supabase-js";

let client = null;

export function getSupabase() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

function requireSupabase() {
  const db = getSupabase();
  if (!db) {
    throw new Error(
      "Supabase ist nicht konfiguriert. NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local setzen."
    );
  }
  return db;
}

/** Lazy-Client — erst bei Nutzung initialisiert (Build/Dev stabil). */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const db = requireSupabase();
      const value = db[prop];
      return typeof value === "function" ? value.bind(db) : value;
    },
  }
);
