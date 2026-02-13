import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { verifyMfaToken } from "@/lib/mfa-token";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid application ID." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mfaToken = (await cookies()).get("mfa_verified")?.value;
  let hasMfa = false;
  if (mfaToken) {
    try {
      hasMfa = await verifyMfaToken(mfaToken, session.user.id);
    } catch {
      hasMfa = false;
    }
  }

  if (!hasMfa) {
    return NextResponse.json({ error: "MFA verification required." }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from("doctor_applications")
    .update({ status: "rejected" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
