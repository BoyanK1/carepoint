import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/security/request-guard";

interface UserProfileRow {
  id: string;
  full_name: string | null;
}

interface DoctorReviewRow {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  verified_visit: boolean;
}

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

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

  const { data, error } = await admin
    .from("doctor_reviews")
    .select("id, reviewer_id, rating, comment, created_at, verified_visit")
    .eq("doctor_profile_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error && !isMissingDoctorReviewsTable(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reviews = isMissingDoctorReviewsTable(error)
    ? []
    : ((data ?? []) as DoctorReviewRow[]);
  const reviewerIds = Array.from(new Set(reviews.map((review) => review.reviewer_id)));
  let reviewerProfiles: UserProfileRow[] = [];

  if (reviewerIds.length > 0) {
    const { data: reviewerData, error: reviewerError } = await admin
      .from("user_profiles")
      .select("id, full_name")
      .in("id", reviewerIds);

    if (reviewerError) {
      return NextResponse.json({ error: reviewerError.message }, { status: 500 });
    }

    reviewerProfiles = (reviewerData ?? []) as UserProfileRow[];
  }

  const reviewerMap = new Map(
    reviewerProfiles.map((profile) => [profile.id, profile.full_name || "Patient"])
  );

  return NextResponse.json({
    reviews: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      reviewerName: reviewerMap.get(review.reviewer_id) || "Patient",
      verifiedVisit: review.verified_visit,
      mine: false,
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ doctorId: string }> }
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const { doctorId } = await context.params;
  if (!UUID_PATTERN.test(doctorId)) {
    return NextResponse.json({ error: "Invalid doctor ID." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment = String(body?.comment ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  if (comment.length < 5) {
    return NextResponse.json(
      { error: "Comment must be at least 5 characters long." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { data: doctorProfile, error: doctorError } = await admin
    .from("doctor_profiles")
    .select("id, user_id")
    .eq("id", doctorId)
    .eq("verified", true)
    .single();

  if (doctorError || !doctorProfile) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  }

  if (doctorProfile.user_id === session.user.id) {
    return NextResponse.json(
      { error: "You cannot review your own doctor profile." },
      { status: 400 }
    );
  }

  const { data: completedVisit, error: completedVisitError } = await admin
    .from("appointments")
    .select("id")
    .eq("patient_user_id", session.user.id)
    .eq("doctor_profile_id", doctorId)
    .eq("status", "completed")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completedVisitError) {
    return NextResponse.json({ error: completedVisitError.message }, { status: 500 });
  }

  if (!completedVisit?.id) {
    return NextResponse.json(
      { error: "Only patients with a completed visit can review this doctor." },
      { status: 403 }
    );
  }

  const { error } = await admin.from("doctor_reviews").upsert(
    {
      doctor_profile_id: doctorId,
      reviewer_id: session.user.id,
      rating,
      comment,
      verified_visit: true,
      verified_appointment_id: completedVisit.id,
    },
    {
      onConflict: "doctor_profile_id,reviewer_id",
    }
  );

  if (error) {
    if (isMissingDoctorReviewsTable(error)) {
      return NextResponse.json(
        {
          error:
            "Reviews are not enabled yet. Run the latest supabase/schema.sql in Supabase SQL Editor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
