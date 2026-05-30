import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const PKW_PORTAL_COOKIE = "bocsa_pkw_portal";

const secret = () => {
  const value = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("SESSION_SECRET fehlt.");
  return new TextEncoder().encode(value);
};

export type PkwPortalSession = {
  fahrzeugId: string;
  kennzeichen: string;
  kundeId: string | null;
};

export async function createPkwPortalToken(session: PkwPortalSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(secret());
}

export async function verifyPkwPortalToken(token: string): Promise<PkwPortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.fahrzeugId || !payload.kennzeichen) return null;
    return {
      fahrzeugId: String(payload.fahrzeugId),
      kennzeichen: String(payload.kennzeichen),
      kundeId: payload.kundeId ? String(payload.kundeId) : null,
    };
  } catch {
    return null;
  }
}

export async function getPkwPortalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PKW_PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPkwPortalToken(token);
}

export function pkwPortalCookieOptions(maxAge = 4 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
