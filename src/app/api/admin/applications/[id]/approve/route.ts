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
    .update({ status: "approved" })
    .eq("id", id)
    .select("user_id, specialty, city")
    .single();

  if (error || !data?.user_id) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  const { data: existingDoctorProfile } = await admin
    .from("doctor_profiles")
    .select("id")
    .eq("user_id", data.user_id)
    .maybeSingle();

  let doctorProfileId = existingDoctorProfile?.id as string | undefined;
  if (doctorProfileId) {
    await admin
      .from("doctor_profiles")
      .update({
        specialty: data.specialty,
        city: data.city,
        verified: true,
      })
      .eq("id", doctorProfileId);
  } else {
    const { data: insertedDoctorProfile } = await admin
      .from("doctor_profiles")
      .insert({
        user_id: data.user_id,
        specialty: data.specialty,
        city: data.city,
        verified: true,
      })
      .select("id")
      .single();

    doctorProfileId = insertedDoctorProfile?.id as string | undefined;
  }

  await admin.from("user_profiles").update({ role: "doctor" }).eq("id", data.user_id);

  if (doctorProfileId) {
    await admin.from("doctor_availability").upsert(
      [1, 2, 3, 4, 5].map((day) => ({
        doctor_profile_id: doctorProfileId,
        day_of_week: day,
        start_time: "09:00:00",
        end_time: "17:00:00",
        slot_minutes: 30,
      })),
      { onConflict: "doctor_profile_id,day_of_week,start_time,end_time" }
    );
  }

  await admin.from("admin_audit_logs").insert({
    admin_user_id: session.user.id,
    target_user_id: data.user_id,
    application_id: id,
    action: "application_approved",
    metadata: {
      specialty: data.specialty,
      city: data.city,
      ip: request.headers.get("x-forwarded-for") || null,
      userAgent: request.headers.get("user-agent") || null,
    },
  });

  await createNotification(admin, {
    userId: data.user_id,
    category: "doctor-application",
    title: "Doctor application approved",
    message: "Your doctor verification was approved. You are now visible in search.",
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
      subject: "CarePoint doctor application approved",
      text: `Hi ${applicantProfile?.full_name || "doctor"}, your application was approved.`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
