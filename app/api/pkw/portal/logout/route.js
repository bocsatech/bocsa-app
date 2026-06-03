import { NextResponse } from "next/server";
import { PKW_PORTAL_COOKIE, pkwPortalCookieOptions } from "../../../../../lib/auth/pkw-portal";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PKW_PORTAL_COOKIE, "", {
    ...pkwPortalCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
