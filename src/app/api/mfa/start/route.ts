import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { authOptions } from "@/lib/auth";
import { hashMfaCode } from "@/lib/mfa-token";

const resend = new Resend(process.env.RESEND_API_KEY);
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const now = Date.now();
  const previousWindow = Number(cookieStore.get("mfa_send_window")?.value ?? now);
  const previousCount = Number(cookieStore.get("mfa_send_count")?.value ?? 0);
  const activeWindow = now - previousWindow <= SEND_WINDOW_MS;
  const sendCount = activeWindow ? previousCount : 0;

  if (sendCount >= MAX_SENDS_PER_WINDOW) {
    return NextResponse.json(
      { error: "Too many code requests. Please wait and try again." },
      { status: 429 }
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  let codeHash: string;
  try {
    codeHash = await hashMfaCode(session.user.id, code);
  } catch {
    return NextResponse.json(
      { error: "MFA is not configured correctly." },
      { status: 500 }
    );
  }
  const expiresAt = Date.now() + 5 * 60 * 1000;

  try {
    await resend.emails.send({
      from: "CarePoint <onboarding@resend.dev>",
      to: session.user.email,
      subject: "Your CarePoint verification code",
      text: `Your CarePoint MFA code is ${code}. It expires in 5 minutes.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send code." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("mfa_code_hash", codeHash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60,
    path: "/",
  });
  response.cookies.set("mfa_uid", session.user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60,
    path: "/",
  });
  response.cookies.set("mfa_expires", String(expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60,
    path: "/",
  });
  response.cookies.set("mfa_attempts", "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60,
    path: "/",
  });
  response.cookies.set("mfa_send_window", String(activeWindow ? previousWindow : now), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SEND_WINDOW_MS / 1000),
    path: "/",
  });
  response.cookies.set("mfa_send_count", String(sendCount + 1), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SEND_WINDOW_MS / 1000),
    path: "/",
  });
  response.cookies.set("mfa_verified", "", { maxAge: 0, path: "/" });

  return response;
}
