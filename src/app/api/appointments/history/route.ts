import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status")?.trim();
  const fromFilter = url.searchParams.get("from")?.trim();
  const toFilter = url.searchParams.get("to")?.trim();

  let query = admin
    .from("appointments")
    .select(
      "id, doctor_profile_id, starts_at, ends_at, status, reason, created_at, canceled_at"
    )
    .eq("patient_user_id", session.user.id)
    .order("starts_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (fromFilter) {
    query = query.gte("starts_at", new Date(fromFilter).toISOString());
  }
  if (toFilter) {
    query = query.lte("starts_at", new Date(toFilter).toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appointments =
    (data as Array<{
      id: string;
      doctor_profile_id: string | null;
      starts_at: string;
      ends_at: string | null;
      status: string;
      reason: string | null;
      created_at: string;
      canceled_at: string | null;
    }> | null) ?? [];

  const doctorIds = Array.from(
    new Set(
      appointments
        .map((appointment) => appointment.doctor_profile_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: doctorsData, error: doctorsError } = doctorIds.length
    ? await admin
        .from("doctor_profiles")
        .select("id, user_id, specialty, city")
        .in("id", doctorIds)
    : { data: [], error: null };

  if (doctorsError) {
    return NextResponse.json({ error: doctorsError.message }, { status: 500 });
  }

  const doctors =
    (doctorsData as Array<{
      id: string;
      user_id: string;
      specialty: string | null;
      city: string | null;
    }> | null) ?? [];
  const doctorUserIds = Array.from(new Set(doctors.map((doctor) => doctor.user_id)));

  const { data: userProfiles, error: usersError } = doctorUserIds.length
    ? await admin
        .from("user_profiles")
        .select("id, full_name")
        .in("id", doctorUserIds)
    : { data: [], error: null };

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const doctorMap = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const userMap = new Map(
    ((userProfiles ?? []) as Array<{ id: string; full_name: string | null }>).map((profile) => [
      profile.id,
      profile.full_name || "Doctor",
    ])
  );

  return NextResponse.json({
    history: appointments.map((appointment) => {
      const doctor = appointment.doctor_profile_id
        ? doctorMap.get(appointment.doctor_profile_id)
        : null;
      return {
        id: appointment.id,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
        reason: appointment.reason,
        createdAt: appointment.created_at,
        canceledAt: appointment.canceled_at,
        doctor: doctor
          ? {
              id: doctor.id,
              name: userMap.get(doctor.user_id) || "Doctor",
              specialty: doctor.specialty,
              city: doctor.city,
            }
          : null,
      };
    }),
  });
}
