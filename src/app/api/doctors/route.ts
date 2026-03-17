import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getAvailableSlots,
  type AvailabilityRow,
  type AppointmentWindow,
} from "@/lib/appointments";

interface DoctorProfileRow {
  id: string;
  user_id: string;
  specialty: string | null;
  city: string | null;
}

interface UserProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
}

interface DoctorReviewRow {
  id: string;
  doctor_profile_id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  verified_visit: boolean;
}

function isMissingDoctorReviewsTable(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    (error.code === "PGRST205" || message.includes("could not find the table")) &&
    message.includes("doctor_reviews")
  );
}

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);

  const { data: doctorProfiles, error: doctorError } = await admin
    .from("doctor_profiles")
    .select("id, user_id, specialty, city")
    .eq("verified", true)
    .order("created_at", { ascending: false });

  if (doctorError) {
    return NextResponse.json({ error: doctorError.message }, { status: 500 });
  }

  const doctors = (doctorProfiles ?? []) as DoctorProfileRow[];
  if (doctors.length === 0) {
    return NextResponse.json({ doctors: [] });
  }

  const doctorIds = doctors.map((doctor) => doctor.id);
  const doctorUserIds = doctors.map((doctor) => doctor.user_id);

  const [{ data: doctorUsers, error: usersError }, { data: reviewsData, error: reviewsError }] =
    await Promise.all([
      admin
        .from("user_profiles")
        .select("id, full_name, avatar_url, city")
        .in("id", doctorUserIds),
      admin
        .from("doctor_reviews")
        .select("id, doctor_profile_id, reviewer_id, rating, comment, created_at, verified_visit")
        .in("doctor_profile_id", doctorIds)
        .order("created_at", { ascending: false }),
    ]);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  if (reviewsError && !isMissingDoctorReviewsTable(reviewsError)) {
    return NextResponse.json({ error: reviewsError.message }, { status: 500 });
  }

  const [availabilityResult, appointmentsResult, favoritesResult] = await Promise.all([
    admin
      .from("doctor_availability")
      .select("doctor_profile_id, day_of_week, start_time, end_time, slot_minutes, is_active")
      .in("doctor_profile_id", doctorIds)
      .eq("is_active", true),
    admin
      .from("appointments")
      .select("doctor_profile_id, starts_at, ends_at, status")
      .in("doctor_profile_id", doctorIds)
      .gte("starts_at", new Date().toISOString())
      .in("status", ["scheduled", "confirmed"]),
    session?.user?.id
      ? admin
          .from("favorite_doctors")
          .select("doctor_profile_id")
          .eq("user_id", session.user.id)
          .in("doctor_profile_id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (availabilityResult.error) {
    return NextResponse.json({ error: availabilityResult.error.message }, { status: 500 });
  }

  if (appointmentsResult.error) {
    return NextResponse.json({ error: appointmentsResult.error.message }, { status: 500 });
  }

  if (favoritesResult.error) {
    return NextResponse.json({ error: favoritesResult.error.message }, { status: 500 });
  }

  const reviews = isMissingDoctorReviewsTable(reviewsError)
    ? []
    : ((reviewsData ?? []) as DoctorReviewRow[]);
  const reviewerIds = Array.from(new Set(reviews.map((review) => review.reviewer_id)));

  let reviewerProfiles: UserProfileRow[] = [];
  if (reviewerIds.length > 0) {
    const { data: reviewerData, error: reviewerError } = await admin
      .from("user_profiles")
      .select("id, full_name, avatar_url, city")
      .in("id", reviewerIds);

    if (reviewerError) {
      return NextResponse.json({ error: reviewerError.message }, { status: 500 });
    }

    reviewerProfiles = (reviewerData ?? []) as UserProfileRow[];
  }

  const doctorUserMap = new Map(
    ((doctorUsers ?? []) as UserProfileRow[]).map((profile) => [profile.id, profile])
  );
  const reviewerMap = new Map(
    reviewerProfiles.map((profile) => [profile.id, profile])
  );

  const reviewsByDoctor = new Map<string, DoctorReviewRow[]>();
  for (const review of reviews) {
    const current = reviewsByDoctor.get(review.doctor_profile_id) ?? [];
    current.push(review);
    reviewsByDoctor.set(review.doctor_profile_id, current);
  }

  const availabilityByDoctor = new Map<string, AvailabilityRow[]>();
  for (const row of (availabilityResult.data ?? []) as AvailabilityRow[]) {
    const current = availabilityByDoctor.get(row.doctor_profile_id) ?? [];
    current.push(row);
    availabilityByDoctor.set(row.doctor_profile_id, current);
  }

  const appointmentsByDoctor = new Map<string, AppointmentWindow[]>();
  for (const row of (appointmentsResult.data ?? []) as Array<{
    doctor_profile_id: string;
    starts_at: string;
    ends_at: string | null;
    status: string;
  }>) {
    const current = appointmentsByDoctor.get(row.doctor_profile_id) ?? [];
    current.push({
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      status: row.status,
    });
    appointmentsByDoctor.set(row.doctor_profile_id, current);
  }

  const favoriteDoctorIds = new Set(
    ((favoritesResult.data ?? []) as Array<{ doctor_profile_id: string }>).map(
      (item) => item.doctor_profile_id
    )
  );

  const payload = doctors
    .map((doctor) => {
      const userProfile = doctorUserMap.get(doctor.user_id);
      const doctorReviews = reviewsByDoctor.get(doctor.id) ?? [];
      const totalRating = doctorReviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const ratingCount = doctorReviews.length;
      const ratingAverage =
        ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(1)) : null;

      const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: doctorReviews.filter((review) => review.rating === stars).length,
      }));

      const soonestAvailableSlot = getAvailableSlots(
        availabilityByDoctor.get(doctor.id) ?? [],
        appointmentsByDoctor.get(doctor.id) ?? [],
        { maxSlots: 1, daysAhead: 30 }
      )[0];

      return {
        id: doctor.id,
        userId: doctor.user_id,
        name: userProfile?.full_name || "Verified doctor",
        specialty: doctor.specialty,
        city: doctor.city || userProfile?.city || null,
        avatarUrl: userProfile?.avatar_url || null,
        ratingAverage,
        ratingCount,
        ratingBreakdown,
        soonestAvailableAt: soonestAvailableSlot?.startsAt ?? null,
        isFavorite: favoriteDoctorIds.has(doctor.id),
        latestReviews: doctorReviews.slice(0, 3).map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
          verifiedVisit: review.verified_visit,
          reviewerName: reviewerMap.get(review.reviewer_id)?.full_name || "Patient",
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ doctors: payload });
}
