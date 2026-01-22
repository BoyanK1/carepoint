import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();

  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const cookieStore = cookies();
  const storedCode = cookieStore.get("mfa_code")?.value;
  const storedExpires = cookieStore.get("mfa_expires")?.value;

  if (!storedCode || !storedExpires) {
    return NextResponse.json({ error: "No active MFA challenge." }, { status: 400 });
  }

  if (Date.now() > Number(storedExpires)) {
    return NextResponse.json({ error: "Code expired." }, { status: 400 });
  }

  if (storedCode !== code) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("mfa_verified", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });
  response.cookies.set("mfa_code", "", { maxAge: 0, path: "/" });
  response.cookies.set("mfa_expires", "", { maxAge: 0, path: "/" });

  return response;
}
