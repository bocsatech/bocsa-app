import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/auth/constants";
import { verifySessionToken } from "./lib/auth/session";

const PUBLIC_PATHS = [
  "/login",
  "/start",
  "/home-icons",
  "/pkw/buchen",
  "/images",
  "/qr-codes",
  "/pruefprotokolle",
  "/betriebsanleitungen",
  "/machines/images",
  "/machines/qr-codes",
];

function isPublicMachinePath(pathname: string) {
  return /^\/maschinen\/[^/]+$/.test(pathname);
}

function isPublicMachineApi(request: NextRequest) {
  const { pathname } = request.nextUrl;
  return ((request.method === "GET" && /^\/api\/machines\/[^/]+$/.test(pathname)) || (request.method === "POST" && /^\/api\/machines\/[^/]+\/meldung$/.test(pathname)));
}

function isPublicPkwApi(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api/pkw/slots" && request.method === "GET") return true;
  if (pathname === "/api/pkw/servicearten" && request.method === "GET") return true;
  if (pathname.startsWith("/api/pkw/portal/")) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/arbeitsprotokol" || pathname.startsWith("/arbeitsprotokol/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/arbeitsauftrag";
    return NextResponse.redirect(url);
  }

  if (pathname === "/szerviz" || pathname.startsWith("/szerviz/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/pkw-service";
    url.search = search;
    return NextResponse.redirect(url);
  }

  if (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    isPublicMachinePath(pathname) ||
    isPublicMachineApi(request) ||
    isPublicPkwApi(request) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session: Awaited<ReturnType<typeof verifySessionToken>> = null;
  if (token) {
    try {
      session = await verifySessionToken(token);
    } catch {
      session = null;
    }
  }

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
