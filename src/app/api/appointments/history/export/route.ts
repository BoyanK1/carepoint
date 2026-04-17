import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  completeExpiredAppointments,
  getEffectiveAppointmentStatus,
} from "@/lib/appointments";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Response("Supabase admin is not configured.", { status: 500 });
  }

  const { data, error } = await admin
    .from("appointments")
    .select("id, starts_at, ends_at, status, reason, doctor_profile_id")
    .eq("patient_user_id", session.user.id)
    .order("starts_at", { ascending: false });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  try {
    await completeExpiredAppointments(
      admin,
      ((data ?? []) as Array<{
        id: string;
        starts_at: string;
        ends_at: string | null;
        status: string;
      }>).map((row) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
      }))
    );
  } catch (normalizeError) {
    return new Response(
      normalizeError instanceof Error
        ? normalizeError.message
        : "Could not normalize appointment export.",
      { status: 500 }
    );
  }

  const lines = [
    ["appointment_id", "doctor_profile_id", "starts_at", "ends_at", "status", "reason"].join(","
    ),
  ];

  for (const row of (data ?? []) as Array<{
    id: string;
    starts_at: string;
    ends_at: string | null;
    status: string;
    reason: string | null;
    doctor_profile_id: string | null;
  }>) {
    const escapedReason = (row.reason ?? "").replaceAll('"', '""');
    lines.push(
      [
        row.id,
        row.doctor_profile_id ?? "",
        row.starts_at,
        row.ends_at ?? "",
        getEffectiveAppointmentStatus({
          id: row.id,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          status: row.status,
        }),
        `"${escapedReason}"`,
      ].join(",")
    );
  }

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="carepoint-history.csv"',
      "Cache-Control": "no-store",
    },
  });
}
