import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { resolveAppointmentAccess } from "@/lib/appointment-access";
import { createManyNotifications, sendStatusEmail } from "@/lib/notifications";
import { getAuthUserEmail } from "@/lib/supabase/auth-users";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";
import { syncAppointmentReminders } from "@/lib/reminders";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const PAYMENT_WINDOW_SECONDS = 10 * 60;
const PAYMENT_MAX_REQUESTS = 20;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "appointments_payment",
    identifier: `${session.user.id}:${getClientIdentifier(request)}`,
    windowSeconds: PAYMENT_WINDOW_SECONDS,
    maxRequests: PAYMENT_MAX_REQUESTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again later." },
      { status: 429 }
    );
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid appointment ID." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (!access.isPatient && !isAdmin) {
    return NextResponse.json({ error: "Only the patient can pay this deposit." }, { status: 403 });
  }

  if (!["scheduled", "confirmed"].includes(access.appointment.status)) {
    return NextResponse.json(
      { error: "Only active appointments can be paid." },
      { status: 400 }
    );
  }

  if (access.appointment.payment_status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  const amount =
    access.appointment.deposit_amount && access.appointment.deposit_amount > 0
      ? access.appointment.deposit_amount
      : 20;

  const paymentReference = `mock_${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  const { error: updateError } = await admin
    .from("appointments")
    .update({
      payment_status: "paid",
      payment_provider: "mock_stripe",
      payment_reference: paymentReference,
      paid_at: nowIso,
      status: "confirmed",
      deposit_amount: amount,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await admin.from("appointment_events").insert({
    appointment_id: id,
    actor_user_id: session.user.id,
    event_type: "deposit_paid",
    event_note: `Mock payment confirmed (${paymentReference})`,
  });

  await syncAppointmentReminders(
    admin,
    id,
    access.appointment.starts_at,
    "confirmed"
  );

  const patientName = profile?.full_name || session.user.name || session.user.email || "Patient";
  const patientEmail = session.user.email || (await getAuthUserEmail(session.user.id));

  let doctorName = "Doctor";
  let doctorEmail: string | null = null;

  if (access.doctorUserId) {
    const { data: doctorProfile } = await admin
      .from("user_profiles")
      .select("full_name")
      .eq("id", access.doctorUserId)
      .maybeSingle();

    doctorName = doctorProfile?.full_name || "Doctor";
    doctorEmail = await getAuthUserEmail(access.doctorUserId);
  }

  const appointmentLabel = new Date(access.appointment.starts_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await createManyNotifications(admin, [
    {
      userId: session.user.id,
      category: "payment",
      title: "Deposit paid",
      message: `Your deposit was confirmed for ${appointmentLabel}.`,
      entityType: "appointment",
      entityId: id,
    },
    ...(access.doctorUserId
      ? [
          {
            userId: access.doctorUserId,
            category: "payment",
            title: "Patient deposit paid",
            message: `${patientName} paid the deposit for ${appointmentLabel}.`,
            entityType: "appointment",
            entityId: id,
          },
        ]
      : []),
  ]);

  if (patientEmail) {
    await sendStatusEmail({
      to: patientEmail,
      subject: "CarePoint deposit confirmed",
      text: `Your mock payment was accepted. Appointment with ${doctorName} is confirmed for ${appointmentLabel}.`,
    }).catch(() => null);
  }

  if (doctorEmail) {
    await sendStatusEmail({
      to: doctorEmail,
      subject: "CarePoint deposit update",
      text: `${patientName} paid the appointment deposit. Visit time: ${appointmentLabel}.`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, paymentStatus: "paid", reference: paymentReference });
}
