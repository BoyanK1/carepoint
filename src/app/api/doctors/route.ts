import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

  const { data: doctorUsers, error: usersError } = await admin
    .from("user_profiles")
    .select("id, full_name, avatar_url, city")
    .in("id", doctorUserIds);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const { data: reviewsData, error: reviewsError } = await admin
    .from("doctor_reviews")
    .select("id, doctor_profile_id, reviewer_id, rating, comment, created_at")
    .in("doctor_profile_id", doctorIds)
    .order("created_at", { ascending: false });

  if (reviewsError && !isMissingDoctorReviewsTable(reviewsError)) {
    return NextResponse.json({ error: reviewsError.message }, { status: 500 });
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

      return {
        id: doctor.id,
        userId: doctor.user_id,
        name: userProfile?.full_name || "Verified doctor",
        specialty: doctor.specialty,
        city: doctor.city || userProfile?.city || null,
        avatarUrl: userProfile?.avatar_url || null,
        ratingAverage,
        ratingCount,
        latestReviews: doctorReviews.slice(0, 3).map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
          reviewerName: reviewerMap.get(review.reviewer_id)?.full_name || "Patient",
        })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ doctors: payload });
}
