export function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret) {
    throw new Error(
      "Hiányzik a SESSION_SECRET a .env.local fájlból (vagy SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return new TextEncoder().encode(secret);
}
