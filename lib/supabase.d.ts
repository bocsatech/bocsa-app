import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabase(): SupabaseClient | null;

export const supabase: SupabaseClient;
