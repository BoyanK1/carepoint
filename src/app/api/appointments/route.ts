import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  isSlotAligned,
  type AvailabilityRow,
} from "@/lib/appointments";
import { createManyNotifications, sendStatusEmail } from "@/lib/notifications";
import { getUserProfile } from "@/lib/profiles";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";
import { getAuthUserEmail } from "@/lib/supabase/auth-users";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const BOOK_WINDOW_SECONDS = 10 * 60;
const BOOK_MAX_REQUESTS = 20;

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { data: appointments, error } = await admin
    .from("appointments")
    .select(
      "id, doctor_profile_id, patient_user_id, starts_at, ends_at, status, reason, created_at, canceled_at, rescheduled_from"
    )
    .eq("patient_user_id", session.user.id)
    .order("starts_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows =
    (appointments as Array<{
      id: string;
      doctor_profile_id: string | null;
      patient_user_id: string | null;
      starts_at: string;
      ends_at: string | null;
      status: string;
      reason: string | null;
      created_at: string;
      canceled_at: string | null;
      rescheduled_from: string | null;
    }> | null) ?? [];

  const doctorIds = Array.from(
    new Set(rows.map((row) => row.doctor_profile_id).filter((value): value is string => Boolean(value)))
  );

  if (doctorIds.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  const [{ data: doctorsData, error: doctorsError }, { data: favoritesData, error: favoritesError }] =
    await Promise.all([
      admin
        .from("doctor_profiles")
        .select("id, user_id, specialty, city")
        .in("id", doctorIds),
      admin
        .from("favorite_doctors")
        .select("doctor_profile_id")
        .eq("user_id", session.user.id)
        .in("doctor_profile_id", doctorIds),
    ]);

  if (doctorsError) {
    return NextResponse.json({ error: doctorsError.message }, { status: 500 });
  }
  if (favoritesError) {
    return NextResponse.json({ error: favoritesError.message }, { status: 500 });
  }

  const doctors =
    (doctorsData as Array<{
      id: string;
      user_id: string;
      specialty: string | null;
      city: string | null;
    }> | null) ?? [];

  const doctorUserIds = Array.from(new Set(doctors.map((row) => row.user_id)));
  const { data: userProfiles, error: usersError } = doctorUserIds.length
    ? await admin
        .from("user_profiles")
        .select("id, full_name, avatar_url, city")
        .in("id", doctorUserIds)
    : { data: [], error: null };

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const profileMap = new Map(
    ((userProfiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      city: string | null;
    }>).map((item) => [item.id, item])
  );
  const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const favorites = new Set(
    ((favoritesData ?? []) as Array<{ doctor_profile_id: string }>).map(
      (item) => item.doctor_profile_id
    )
  );

  return NextResponse.json({
    appointments: rows.map((row) => {
      const doctor = row.doctor_profile_id ? doctorMap.get(row.doctor_profile_id) : null;
      const doctorProfile = doctor ? profileMap.get(doctor.user_id) : null;
      return {
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        reason: row.reason,
        createdAt: row.created_at,
        canceledAt: row.canceled_at,
        rescheduledFrom: row.rescheduled_from,
        doctor: doctor
          ? {
              id: doctor.id,
              userId: doctor.user_id,
              name: doctorProfile?.full_name || "Doctor",
              specialty: doctor.specialty,
              city: doctor.city || doctorProfile?.city || null,
              avatarUrl: doctorProfile?.avatar_url || null,
              isFavorite: favorites.has(doctor.id),
            }
          : null,
      };
    }),
  });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "appointments_book",
    identifier: `${session.user.id}:${getClientIdentifier(request)}`,
    windowSeconds: BOOK_WINDOW_SECONDS,
    maxRequests: BOOK_MAX_REQUESTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again later." },
      { status: 429 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const doctorProfileId = String(body?.doctorProfileId ?? "").trim();
  const startsAt = String(body?.startsAt ?? "").trim();
  const reason = String(body?.reason ?? "").trim().slice(0, 500);

  if (!UUID_PATTERN.test(doctorProfileId)) {
    return NextResponse.json({ error: "Invalid doctor profile ID." }, { status: 400 });
  }

  const slotStart = new Date(startsAt);
  if (Number.isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now() + 60_000) {
    return NextResponse.json({ error: "Invalid appointment start time." }, { status: 400 });
  }

  const { data: doctor, error: doctorError } = await admin
    .from("doctor_profiles")
    .select("id, user_id, specialty, city, verified")
    .eq("id", doctorProfileId)
    .eq("verified", true)
    .single();

  if (doctorError || !doctor) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  }

  const { data: availabilityData, error: availabilityError } = await admin
    .from("doctor_availability")
    .select("doctor_profile_id, day_of_week, start_time, end_time, slot_minutes, is_active")
    .eq("doctor_profile_id", doctorProfileId)
    .eq("is_active", true);

  if (availabilityError) {
    return NextResponse.json({ error: availabilityError.message }, { status: 500 });
  }

  const availability = (availabilityData ?? []) as AvailabilityRow[];
  const matchingRow = availability.find((row) => {
    if (!isSlotAligned(slotStart, row)) {
      return false;
    }
    const slotEnd = new Date(slotStart.getTime() + row.slot_minutes * 60_000);
    return slotEnd <= getWindowEnd(slotStart, row.end_time);
  });

  if (!matchingRow) {
    return NextResponse.json(
      { error: "Selected time slot is not in the doctor's schedule." },
      { status: 400 }
    );
  }

  const slotEnd = new Date(slotStart.getTime() + matchingRow.slot_minutes * 60_000);

  const { data: appointment, error: insertError } = await admin
    .from("appointments")
    .insert({
      doctor_profile_id: doctorProfileId,
      patient_user_id: session.user.id,
      starts_at: slotStart.toISOString(),
      ends_at: slotEnd.toISOString(),
      status: "scheduled",
      reason: reason || null,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23P01") {
      return NextResponse.json(
        { error: "This slot was just booked. Please choose another time." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin.from("appointment_events").insert({
    appointment_id: appointment.id,
    actor_user_id: session.user.id,
    event_type: "booked",
    event_note: reason || null,
  });

  const [doctorProfileResult, patientProfile, doctorEmail] = await Promise.all([
    admin
      .from("user_profiles")
      .select("id, full_name")
      .eq("id", doctor.user_id)
      .single(),
    getUserProfile(session.user.id),
    getAuthUserEmail(doctor.user_id),
  ]);

  const patientName =
    patientProfile?.full_name || session.user.name || session.user.email || "Patient";
  const doctorName = doctorProfileResult.data?.full_name || "Doctor";
  const dateLabel = slotStart.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await createManyNotifications(admin, [
    {
      userId: session.user.id,
      category: "appointment",
      title: "Appointment booked",
      message: `Your visit with ${doctorName} is scheduled for ${dateLabel}.`,
      entityType: "appointment",
      entityId: appointment.id,
    },
    {
      userId: doctor.user_id,
      category: "appointment",
      title: "New appointment",
      message: `${patientName} booked a visit for ${dateLabel}.`,
      entityType: "appointment",
      entityId: appointment.id,
    },
  ]);

  if (session.user.email) {
    await sendStatusEmail({
      to: session.user.email,
      subject: "CarePoint booking confirmed",
      text: `Your appointment with ${doctorName} is booked for ${dateLabel}.`,
    }).catch(() => null);
  }

  if (doctorEmail) {
    await sendStatusEmail({
      to: doctorEmail,
      subject: "New CarePoint appointment",
      text: `${patientName} booked an appointment for ${dateLabel}.`,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, appointmentId: appointment.id });
}
