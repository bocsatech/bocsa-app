export function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET fehlt in .env.local (oder SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return new TextEncoder().encode(secret);
}
