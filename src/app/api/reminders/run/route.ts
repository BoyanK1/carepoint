import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification, sendStatusEmail } from "@/lib/notifications";
import { getAuthUserEmail } from "@/lib/supabase/auth-users";

const ACTIVE_STATUSES = new Set(["scheduled", "confirmed"]);

function isAuthorized(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-cron-secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  return headerSecret === secret || bearer === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const nowIso = new Date().toISOString();

  const { data: reminders, error: remindersError } = await admin
    .from("appointment_reminders")
    .select("id, appointment_id, reminder_type, scheduled_for")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(120);

  if (remindersError) {
    return NextResponse.json({ error: remindersError.message }, { status: 500 });
  }

  const rows =
    (reminders as Array<{
      id: string;
      appointment_id: string;
      reminder_type: "24h" | "1h";
      scheduled_for: string;
    }> | null) ?? [];

  let sent = 0;
  let skipped = 0;
  const failures: Array<{ id: string; reason: string }> = [];

  for (const row of rows) {
    try {
      const { data: appointment } = await admin
        .from("appointments")
        .select("id, patient_user_id, doctor_profile_id, starts_at, status")
        .eq("id", row.appointment_id)
        .maybeSingle();

      if (!appointment || !ACTIVE_STATUSES.has(appointment.status)) {
        await admin
          .from("appointment_reminders")
          .update({ status: "failed", error_message: "Appointment inactive or missing." })
          .eq("id", row.id)
          .eq("status", "pending");
        skipped += 1;
        continue;
      }

      const { data: doctorProfile } = appointment.doctor_profile_id
        ? await admin
            .from("doctor_profiles")
            .select("user_id")
            .eq("id", appointment.doctor_profile_id)
            .maybeSingle()
        : { data: null };

      const { data: patientProfile } = await admin
        .from("user_profiles")
        .select("full_name")
        .eq("id", appointment.patient_user_id)
        .maybeSingle();

      const { data: doctorUserProfile } = doctorProfile?.user_id
        ? await admin
            .from("user_profiles")
            .select("full_name")
            .eq("id", doctorProfile.user_id)
            .maybeSingle()
        : { data: null };

      const patientName = patientProfile?.full_name || "Patient";
      const doctorName = doctorUserProfile?.full_name || "Doctor";
      const label = new Date(appointment.starts_at).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const prefix = row.reminder_type === "24h" ? "Reminder: tomorrow" : "Reminder: in 1 hour";

      await createNotification(admin, {
        userId: appointment.patient_user_id,
        category: "reminder",
        title: `${prefix} appointment`,
        message: `Visit with ${doctorName} at ${label}.`,
        entityType: "appointment",
        entityId: appointment.id,
      });

      if (doctorProfile?.user_id) {
        await createNotification(admin, {
          userId: doctorProfile.user_id,
          category: "reminder",
          title: `${prefix} appointment`,
          message: `${patientName} is booked at ${label}.`,
          entityType: "appointment",
          entityId: appointment.id,
        });
      }

      const patientEmail = await getAuthUserEmail(appointment.patient_user_id);
      if (patientEmail) {
        await sendStatusEmail({
          to: patientEmail,
          subject: `CarePoint reminder (${row.reminder_type})`,
          text: `Reminder: appointment with ${doctorName} at ${label}.`,
        }).catch(() => null);
      }

      if (doctorProfile?.user_id) {
        const doctorEmail = await getAuthUserEmail(doctorProfile.user_id);
        if (doctorEmail) {
          await sendStatusEmail({
            to: doctorEmail,
            subject: `CarePoint reminder (${row.reminder_type})`,
            text: `Reminder: ${patientName} appointment at ${label}.`,
          }).catch(() => null);
        }
      }

      await admin
        .from("appointment_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("id", row.id)
        .eq("status", "pending");

      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reminder send failed.";
      failures.push({ id: row.id, reason: message });
      await admin
        .from("appointment_reminders")
        .update({ status: "failed", error_message: message.slice(0, 400) })
        .eq("id", row.id)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ ok: true, processed: rows.length, sent, skipped, failures });
}
