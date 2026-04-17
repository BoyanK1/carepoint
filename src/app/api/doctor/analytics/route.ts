import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import {
  completeExpiredAppointments,
  getEffectiveAppointmentStatus,
} from "@/lib/appointments";

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = (day + 6) % 7;
  result.setUTCDate(result.getUTCDate() - diff);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const userProfile = await getUserProfile(session.user.id);
  const isAdmin = userProfile?.role === "admin";

  let doctorUserId = session.user.id;
  if (isAdmin) {
    const url = new URL(request.url);
    const requested = url.searchParams.get("doctorUserId")?.trim();
    if (requested) {
      doctorUserId = requested;
    }
  }

  if (!isAdmin && userProfile?.role !== "doctor") {
    return NextResponse.json({ error: "Doctor access required." }, { status: 403 });
  }

  const { data: doctorProfile, error: doctorError } = await admin
    .from("doctor_profiles")
    .select("id, user_id, specialty, city, verified")
    .eq("user_id", doctorUserId)
    .eq("verified", true)
    .maybeSingle();

  if (doctorError || !doctorProfile) {
    return NextResponse.json({ error: "Doctor profile not found." }, { status: 404 });
  }

  const [{ data: appointments, error: appointmentsError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      admin
        .from("appointments")
        .select("id, starts_at, status")
        .eq("doctor_profile_id", doctorProfile.id)
        .order("starts_at", { ascending: false })
        .limit(2000),
      admin
        .from("doctor_reviews")
        .select("id, rating, created_at")
        .eq("doctor_profile_id", doctorProfile.id)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  if (appointmentsError) {
    return NextResponse.json({ error: appointmentsError.message }, { status: 500 });
  }
  if (reviewsError) {
    return NextResponse.json({ error: reviewsError.message }, { status: 500 });
  }

  const appts =
    (appointments as Array<{ id: string; starts_at: string; status: string }> | null) ?? [];
  const now = Date.now();

  try {
    await completeExpiredAppointments(
      admin,
      appts.map((appointment) => ({
        id: appointment.id,
        startsAt: appointment.starts_at,
        status: appointment.status,
      }))
    );
  } catch (normalizeError) {
    return NextResponse.json(
      {
        error:
          normalizeError instanceof Error
            ? normalizeError.message
            : "Could not normalize appointment analytics.",
      },
      { status: 500 }
    );
  }

  const normalizedAppointments = appts.map((appointment) => ({
    ...appointment,
    status: getEffectiveAppointmentStatus({
      id: appointment.id,
      startsAt: appointment.starts_at,
      status: appointment.status,
    }),
  }));

  const total = normalizedAppointments.length;
  const upcoming = normalizedAppointments.filter(
    (row) =>
      new Date(row.starts_at).getTime() > now && ["scheduled", "confirmed"].includes(row.status)
  ).length;
  const completed = normalizedAppointments.filter((row) => row.status === "completed").length;
  const cancelled = normalizedAppointments.filter((row) => row.status === "cancelled").length;

  const reviewRows = (reviews as Array<{ id: string; rating: number; created_at: string }> | null) ?? [];
  const ratingCount = reviewRows.length;
  const averageRating =
    ratingCount > 0
      ? Number((reviewRows.reduce((sum, row) => sum + row.rating, 0) / ratingCount).toFixed(2))
      : null;

  const weekMap = new Map<string, number>();
  for (const row of normalizedAppointments) {
    const bucket = startOfWeek(new Date(row.starts_at)).toISOString().slice(0, 10);
    weekMap.set(bucket, (weekMap.get(bucket) ?? 0) + 1);
  }

  const weeklyBookings = Array.from(weekMap.entries())
    .map(([weekStart, count]) => ({ weekStart, count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-8);

  return NextResponse.json({
    doctor: {
      id: doctorProfile.id,
      userId: doctorProfile.user_id,
      specialty: doctorProfile.specialty,
      city: doctorProfile.city,
    },
    metrics: {
      total,
      upcoming,
      completed,
      cancelled,
      ratingCount,
      averageRating,
      cancellationRate: total > 0 ? Number(((cancelled / total) * 100).toFixed(1)) : 0,
      weeklyBookings,
    },
  });
}
