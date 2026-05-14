import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const loggedIn = request.cookies.get('bocsa_logged_in')?.value
  const path = request.nextUrl.pathname

  if (path === '/login') {
    return NextResponse.next()
  }

  if (!loggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)']
}
