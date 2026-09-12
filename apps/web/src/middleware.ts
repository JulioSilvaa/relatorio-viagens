import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/inicio", "/viagens", "/notificacoes", "/perfil"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("vdr_session");

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/inicio", request.url));
    }
    return NextResponse.next();
  }

  if (
    PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !hasSession
  ) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.(?:ico|svg)|manifest\\.webmanifest|vaiefecha-|icon\\.svg|icon\\.png).*)",
  ],
};
