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

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isApiRoute = pathname.startsWith("/api/");

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/auth", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
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
      return NextResponse.json({ error: "MFA verification required." }, { status: 401 });
    }
    const mfaUrl = new URL("/mfa", request.url);
    mfaUrl.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
    return NextResponse.redirect(mfaUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/doctor/apply",
    "/api/admin/:path*",
  ],
};
