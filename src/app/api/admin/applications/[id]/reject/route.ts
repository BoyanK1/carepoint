import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { verifyMfaToken } from "@/lib/mfa-token";
import { createNotification, sendStatusEmail } from "@/lib/notifications";
import { hasTrustedOrigin } from "@/lib/security/request-guard";
import { getAuthUserEmail } from "@/lib/supabase/auth-users";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

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

  const { data, error } = await admin
    .from("doctor_applications")
    .update({ status: "rejected" })
    .eq("id", id)
    .select("user_id, specialty, city")
    .single();

  if (error || !data?.user_id) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  await admin
    .from("user_profiles")
    .update({ role: "patient" })
    .eq("id", data.user_id)
    .eq("role", "doctor_pending");

  await admin.from("admin_audit_logs").insert({
    admin_user_id: session.user.id,
    target_user_id: data.user_id,
    application_id: id,
    action: "application_rejected",
    metadata: {
      specialty: data.specialty,
      city: data.city,
    },
  });

  await createNotification(admin, {
    userId: data.user_id,
    category: "doctor-application",
    title: "Doctor application rejected",
    message: "Your application was rejected. Please re-apply with a clear valid license.",
    entityType: "doctor_application",
    entityId: id,
  });

  const { data: applicantProfile } = await admin
    .from("user_profiles")
    .select("full_name")
    .eq("id", data.user_id)
    .maybeSingle();
  const applicantEmail = await getAuthUserEmail(data.user_id);

  if (applicantEmail) {
    await sendStatusEmail({
      to: applicantEmail,
      subject: "CarePoint doctor application update",
      text: `Hi ${applicantProfile?.full_name || "doctor"}, your application was rejected. Please submit updated license proof.`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
