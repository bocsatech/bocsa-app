export function authConfigErrorResponse(error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Supabase ist nicht konfiguriert")) {
    return {
      status: 500,
      error:
        "Lokal: .env.local fehlt oder unvollständig. NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY aus Supabase → Settings → API eintragen.",
    };
  }

  if (message.includes("SESSION_SECRET")) {
    return {
      status: 500,
      error:
        "Lokal: SESSION_SECRET in .env.local setzen (beliebiger langer Zufallsstring) oder SUPABASE_SERVICE_ROLE_KEY eintragen.",
    };
  }

  return null;
}
