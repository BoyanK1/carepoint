import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSlotAligned, type AvailabilityRow } from "@/lib/appointments";
import { createManyNotifications, sendStatusEmail } from "@/lib/notifications";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";
import { getAuthUserEmail } from "@/lib/supabase/auth-users";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const EDIT_WINDOW_SECONDS = 10 * 60;
const EDIT_MAX_REQUESTS = 30;

function getWindowEnd(day: Date, endTime: string) {
  const [hours = "0", minutes = "0", seconds = "0"] = endTime.split(":");
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      Number(hours),
      Number(minutes),
      Number(seconds)
    )
  );
}

export async function PATCH(
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
    namespace: "appointments_edit",
    identifier: `${session.user.id}:${getClientIdentifier(request)}`,
    windowSeconds: EDIT_WINDOW_SECONDS,
    maxRequests: EDIT_MAX_REQUESTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many update attempts. Please try again later." },
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

  const { data: appointment, error: appointmentError } = await admin
    .from("appointments")
    .select(
      "id, doctor_profile_id, patient_user_id, starts_at, ends_at, status, reason"
    )
    .eq("id", id)
    .eq("patient_user_id", session.user.id)
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "").trim();

  if (!["cancel", "reschedule"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (!appointment.doctor_profile_id) {
    return NextResponse.json({ error: "Appointment doctor is missing." }, { status: 400 });
  }

  const { data: doctorProfile } = await admin
    .from("doctor_profiles")
    .select("id, user_id")
    .eq("id", appointment.doctor_profile_id)
    .single();

  const { data: doctorUserProfile } = doctorProfile
    ? await admin
        .from("user_profiles")
        .select("id, full_name")
        .eq("id", doctorProfile.user_id)
        .single()
    : { data: null };
  const doctorEmail = doctorProfile?.user_id
    ? await getAuthUserEmail(doctorProfile.user_id)
    : null;

  const doctorName = doctorUserProfile?.full_name || "Doctor";

  if (action === "cancel") {
    if (!["scheduled", "confirmed"].includes(appointment.status)) {
      return NextResponse.json(
        { error: "Only active appointments can be cancelled." },
        { status: 400 }
      );
    }

    const { error: cancelError } = await admin
      .from("appointments")
      .update({
        status: "cancelled",
        canceled_at: new Date().toISOString(),
        canceled_by: session.user.id,
      })
      .eq("id", id);

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    await admin.from("appointment_events").insert({
      appointment_id: id,
      actor_user_id: session.user.id,
      event_type: "cancelled",
      event_note: "Cancelled by patient",
    });

    const dateLabel = new Date(appointment.starts_at).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    if (doctorProfile?.user_id) {
      await createManyNotifications(admin, [
        {
          userId: session.user.id,
          category: "appointment",
          title: "Appointment cancelled",
          message: `You cancelled your appointment with ${doctorName} (${dateLabel}).`,
          entityType: "appointment",
          entityId: id,
        },
        {
          userId: doctorProfile.user_id,
          category: "appointment",
          title: "Appointment cancelled",
          message: `A patient cancelled the ${dateLabel} appointment.`,
          entityType: "appointment",
          entityId: id,
        },
      ]);
    }

    if (session.user.email) {
      await sendStatusEmail({
        to: session.user.email,
        subject: "CarePoint appointment cancelled",
        text: `Your appointment with ${doctorName} on ${dateLabel} has been cancelled.`,
      }).catch(() => null);
    }

    if (doctorEmail) {
      await sendStatusEmail({
        to: doctorEmail,
        subject: "CarePoint appointment cancelled",
        text: `A patient cancelled the appointment scheduled for ${dateLabel}.`,
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  }

  const startsAt = String(body?.startsAt ?? "").trim();
  if (!["scheduled", "confirmed"].includes(appointment.status)) {
    return NextResponse.json(
      { error: "Only active appointments can be rescheduled." },
      { status: 400 }
    );
  }
  const nextStart = new Date(startsAt);
  if (Number.isNaN(nextStart.getTime()) || nextStart.getTime() < Date.now() + 60_000) {
    return NextResponse.json({ error: "Invalid new appointment time." }, { status: 400 });
  }

  if (nextStart.toISOString() === new Date(appointment.starts_at).toISOString()) {
    return NextResponse.json(
      { error: "This appointment is already at that time." },
      { status: 400 }
    );
  }

  const { data: availabilityData, error: availabilityError } = await admin
    .from("doctor_availability")
    .select("doctor_profile_id, day_of_week, start_time, end_time, slot_minutes, is_active")
    .eq("doctor_profile_id", appointment.doctor_profile_id)
    .eq("is_active", true);

  if (availabilityError) {
    return NextResponse.json({ error: availabilityError.message }, { status: 500 });
  }

  const availability = (availabilityData ?? []) as AvailabilityRow[];
  const matchingRow = availability.find((row) => {
    if (!isSlotAligned(nextStart, row)) {
      return false;
    }
    const slotEnd = new Date(nextStart.getTime() + row.slot_minutes * 60_000);
    return slotEnd <= getWindowEnd(nextStart, row.end_time);
  });

  if (!matchingRow) {
    return NextResponse.json(
      { error: "Selected time slot is not in the doctor's schedule." },
      { status: 400 }
    );
  }

  const nextEnd = new Date(nextStart.getTime() + matchingRow.slot_minutes * 60_000);

  const { data: duplicateAppointment } = await admin
    .from("appointments")
    .select("id")
    .eq("patient_user_id", session.user.id)
    .eq("doctor_profile_id", appointment.doctor_profile_id)
    .eq("starts_at", nextStart.toISOString())
    .in("status", ["scheduled", "confirmed"])
    .neq("id", id)
    .maybeSingle();

  if (duplicateAppointment?.id) {
    return NextResponse.json(
      { error: "You already have this appointment booked." },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("appointments")
    .update({
      starts_at: nextStart.toISOString(),
      ends_at: nextEnd.toISOString(),
      status: "scheduled",
      canceled_at: null,
      canceled_by: null,
    })
    .eq("id", id);

  if (updateError) {
    if (updateError.code === "23P01") {
      return NextResponse.json(
        { error: "This slot is already taken. Pick another one." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await admin.from("appointment_events").insert({
    appointment_id: id,
    actor_user_id: session.user.id,
    event_type: "rescheduled",
    event_note: `Rescheduled from ${appointment.starts_at} to ${nextStart.toISOString()}`,
  });

  const dateLabel = nextStart.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (doctorProfile?.user_id) {
    await createManyNotifications(admin, [
      {
        userId: session.user.id,
        category: "appointment",
        title: "Appointment rescheduled",
        message: `Your appointment with ${doctorName} is now ${dateLabel}.`,
        entityType: "appointment",
        entityId: id,
      },
      {
        userId: doctorProfile.user_id,
        category: "appointment",
        title: "Appointment rescheduled",
        message: `A patient moved their appointment to ${dateLabel}.`,
        entityType: "appointment",
        entityId: id,
      },
    ]);
  }

  if (session.user.email) {
    await sendStatusEmail({
      to: session.user.email,
      subject: "CarePoint appointment rescheduled",
      text: `Your appointment with ${doctorName} was moved to ${dateLabel}.`,
    }).catch(() => null);
  }

  if (doctorEmail) {
    await sendStatusEmail({
      to: doctorEmail,
      subject: "CarePoint appointment rescheduled",
      text: `A patient rescheduled to ${dateLabel}.`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
