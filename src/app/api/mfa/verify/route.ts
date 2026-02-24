import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createMfaToken, hashMfaCode } from "@/lib/mfa-token";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin } from "@/lib/security/request-guard";

const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_WINDOW_SECONDS = 5 * 60;
const MFA_SESSION_TTL_SECONDS = 30 * 60;

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "")
    .trim()
    .replace(/\D/g, "");

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "mfa_verify",
    identifier: session.user.id,
    windowSeconds: VERIFY_WINDOW_SECONDS,
    maxRequests: MAX_VERIFY_ATTEMPTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many invalid attempts. Please request a new code." },
      { status: 429 }
    );
  }

  const cookieStore = await cookies();
  const storedCodeHash = cookieStore.get("mfa_code_hash")?.value;
  const storedExpires = cookieStore.get("mfa_expires")?.value;
  const storedUser = cookieStore.get("mfa_uid")?.value;

  if (!storedCodeHash || !storedExpires || !storedUser) {
    return NextResponse.json({ error: "No active MFA challenge." }, { status: 400 });
  }

  if (storedUser !== session.user.id) {
    return NextResponse.json({ error: "Invalid MFA challenge." }, { status: 400 });
  }

  if (Date.now() > Number(storedExpires)) {
    return NextResponse.json({ error: "Code expired." }, { status: 400 });
  }

  let submittedHash: string;
  try {
    submittedHash = await hashMfaCode(session.user.id, code);
  } catch {
    return NextResponse.json(
      { error: "MFA is not configured correctly." },
      { status: 500 }
    );
  }
  if (storedCodeHash !== submittedHash) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  let token: string;
  try {
    token = await createMfaToken(session.user.id, MFA_SESSION_TTL_SECONDS);
  } catch {
    return NextResponse.json(
      { error: "MFA is not configured correctly." },
      { status: 500 }
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("mfa_verified", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MFA_SESSION_TTL_SECONDS,
    path: "/",
  });
  response.cookies.set("mfa_code_hash", "", { maxAge: 0, path: "/" });
  response.cookies.set("mfa_expires", "", { maxAge: 0, path: "/" });
  response.cookies.set("mfa_uid", "", { maxAge: 0, path: "/" });
  response.cookies.set("mfa_attempts", "", { maxAge: 0, path: "/" });

  return response;
}
