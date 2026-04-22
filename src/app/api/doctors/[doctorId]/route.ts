import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getAvailableSlots,
  type AppointmentWindow,
  type AvailabilityRow,
} from "@/lib/appointments";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ doctorId: string }> }
) {
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

  const session = await getServerSession(authOptions);

  const { data: doctorProfile, error: doctorError } = await admin
    .from("doctor_profiles")
    .select("id, user_id, specialty, city, verified")
    .eq("id", doctorId)
    .eq("verified", true)
    .single();

  if (doctorError || !doctorProfile) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  }

  const [profileResult, availabilityResult, appointmentsResult, reviewsResult, favoriteResult] =
    await Promise.all([
      admin
        .from("user_profiles")
        .select("id, full_name, city, avatar_url")
        .eq("id", doctorProfile.user_id)
        .single(),
      admin
        .from("doctor_availability")
        .select("doctor_profile_id, day_of_week, start_time, end_time, slot_minutes, is_active")
        .eq("doctor_profile_id", doctorId)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true }),
      admin
        .from("appointments")
        .select("starts_at, ends_at, status")
        .eq("doctor_profile_id", doctorId)
        .gte("starts_at", new Date().toISOString())
        .in("status", ["scheduled", "confirmed"]),
      admin
        .from("doctor_reviews")
        .select("id, reviewer_id, rating, comment, created_at, verified_visit")
        .eq("doctor_profile_id", doctorId)
        .order("created_at", { ascending: false }),
      session?.user?.id
        ? admin
            .from("favorite_doctors")
            .select("doctor_profile_id")
            .eq("doctor_profile_id", doctorId)
            .eq("user_id", session.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }
  if (availabilityResult.error) {
    return NextResponse.json({ error: availabilityResult.error.message }, { status: 500 });
  }
  if (appointmentsResult.error) {
    return NextResponse.json({ error: appointmentsResult.error.message }, { status: 500 });
  }
  if (reviewsResult.error) {
    return NextResponse.json({ error: reviewsResult.error.message }, { status: 500 });
  }
  if (favoriteResult.error) {
    return NextResponse.json({ error: favoriteResult.error.message }, { status: 500 });
  }

  const reviews = (reviewsResult.data ?? []) as Array<{
    id: string;
    reviewer_id: string;
    rating: number;
    comment: string;
    created_at: string;
    verified_visit: boolean;
  }>;

  const reviewerIds = Array.from(new Set(reviews.map((item) => item.reviewer_id)));
  const { data: reviewerProfiles, error: reviewerError } = reviewerIds.length
    ? await admin
        .from("user_profiles")
        .select("id, full_name")
        .in("id", reviewerIds)
    : { data: [], error: null };

  if (reviewerError) {
    return NextResponse.json({ error: reviewerError.message }, { status: 500 });
  }

  const reviewerMap = new Map(
    ((reviewerProfiles ?? []) as Array<{ id: string; full_name: string | null }>).map(
      (item) => [item.id, item.full_name || "Patient"]
    )
  );

  const availability = (availabilityResult.data ?? []) as AvailabilityRow[];
  const appointments = (appointmentsResult.data ?? []) as AppointmentWindow[];
  const availableSlots = getAvailableSlots(availability, appointments, {
    daysAhead: 30,
    maxSlots: 50,
  });
  const now = Date.now();
  const bookedSlots = appointments
    .filter(
      (appointment) =>
        ["scheduled", "confirmed"].includes(appointment.status) &&
        new Date(appointment.starts_at).getTime() > now
    )
    .map((appointment) => ({
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
    }));

  const ratingCount = reviews.length;
  const ratingAverage =
    ratingCount > 0
      ? Number(
          (
            reviews.reduce((sum, item) => sum + item.rating, 0) /
            ratingCount
          ).toFixed(1)
        )
      : null;

  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((item) => item.rating === stars).length,
  }));

  return NextResponse.json({
    doctor: {
      id: doctorProfile.id,
      userId: doctorProfile.user_id,
      name: profileResult.data?.full_name || "Verified doctor",
      specialty: doctorProfile.specialty,
      city: doctorProfile.city || profileResult.data?.city || null,
      avatarUrl: profileResult.data?.avatar_url || null,
      ratingAverage,
      ratingCount,
      ratingBreakdown,
      reviews: reviews.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.created_at,
        reviewerName: reviewerMap.get(item.reviewer_id) || "Patient",
        verifiedVisit: item.verified_visit,
      })),
      availability,
      bookedSlots,
      availableSlots,
      isFavorite: Boolean(favoriteResult.data),
    },
  });
}
