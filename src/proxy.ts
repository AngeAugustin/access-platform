import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "access_session";
const PROTECTED_PREFIXES = ["/parent", "/educateur", "/admin"];

// Pose une Content-Security-Policy stricte avec un nonce par requête,
// et renvoie vers la connexion les visiteurs sans cookie de session sur les espaces privés.
// La vérification réelle de la session et du rôle est faite côté serveur (src/lib/auth/dal.ts).
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!request.cookies.has(SESSION_COOKIE)) {
      const url = new URL("/connexion", request.url);
      url.searchParams.set("suite", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.fedapay.com",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|sw.js|icons|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
