import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/security/request-guard";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

export async function POST(
  request: Request,
  context: { params: Promise<{ doctorId: string }> }
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { doctorId } = await context.params;
  if (!UUID_PATTERN.test(doctorId)) {
    return NextResponse.json({ error: "Invalid doctor ID." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { error } = await admin.from("favorite_doctors").upsert(
    {
      user_id: session.user.id,
      doctor_profile_id: doctorId,
    },
    { onConflict: "user_id,doctor_profile_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, favorite: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ doctorId: string }> }
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { doctorId } = await context.params;
  if (!UUID_PATTERN.test(doctorId)) {
    return NextResponse.json({ error: "Invalid doctor ID." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from("favorite_doctors")
    .delete()
    .eq("user_id", session.user.id)
    .eq("doctor_profile_id", doctorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, favorite: false });
}
