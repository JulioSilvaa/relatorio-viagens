import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/inicio", "/viagens", "/notificacoes", "/perfil"];
const ADMIN_PREFIX = "/admin";
const ADMIN_PERMISSIONS = ["USUARIO.CRIAR", "USUARIO.EDITAR"];

interface SessionUser {
  permissions: string[];
}

async function fetchSessionUser(
  request: NextRequest,
  cookie: string,
): Promise<SessionUser | null> {
  const url = new URL("/api/auth/me", request.nextUrl.origin);
  try {
    const response = await fetch(url, { headers: { cookie } });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: { user?: { permissions?: string[] } };
    };
    const permissions = payload?.data?.user?.permissions;
    return { permissions: Array.isArray(permissions) ? permissions : [] };
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete("vdr_session");
  return response;
}

function isUnder(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("vdr_session");

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  if (pathname === "/login" || pathname === "/cadastro") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/inicio", request.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => isUnder(prefix, pathname));
  const isAdmin = isUnder(ADMIN_PREFIX, pathname);

  if (!isProtected && !isAdmin) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  const user = await fetchSessionUser(request, `vdr_session=${sessionCookie.value}`);
  if (!user) {
    return redirectToLogin(request);
  }

  if (isAdmin && !user.permissions.some((permission) => ADMIN_PERMISSIONS.includes(permission))) {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.(?:ico|svg)|manifest\\.webmanifest|vaiefecha-|icon\\.svg|icon\\.png).*)",
  ],
};