import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifyMfaToken } from "@/lib/mfa-token";

const protectedPaths = [
  "/dashboard",
  "/profile",
  "/admin",
  "/doctor/apply",
  "/api/admin",
];

const mfaRequiredPaths = ["/admin", "/api/admin"];

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) {
    value += String.fromCharCode(byte);
  }
  return btoa(value);
}

function buildContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
  ].join("; ");
}

function withSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()"
  );
  response.headers.set("x-nonce", nonce);
  return response;
}

function nextWithNonce(request: NextRequest, nonce: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const nonce = createNonce();
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith("/api/");

  if (!isProtected) {
    return withSecurityHeaders(nextWithNonce(request, nonce), nonce);
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (isApiRoute) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        nonce
      );
    }
    const signInUrl = new URL("/auth", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return withSecurityHeaders(NextResponse.redirect(signInUrl), nonce);
  }

  const mfaRequired = mfaRequiredPaths.some((path) =>
    pathname.startsWith(path)
  );
  const mfaToken = request.cookies.get("mfa_verified")?.value;
  const userId = typeof token.id === "string" ? token.id : "";
  let mfaVerified = false;
  if (mfaToken && userId) {
    try {
      mfaVerified = await verifyMfaToken(mfaToken, userId);
    } catch {
      mfaVerified = false;
    }
  }

  if (mfaRequired && !mfaVerified) {
    if (isApiRoute) {
      return withSecurityHeaders(
        NextResponse.json({ error: "MFA verification required." }, { status: 401 }),
        nonce
      );
    }
    const mfaUrl = new URL("/mfa", request.url);
    mfaUrl.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
    return withSecurityHeaders(NextResponse.redirect(mfaUrl), nonce);
  }

  return withSecurityHeaders(nextWithNonce(request, nonce), nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
