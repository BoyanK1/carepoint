import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  completeExpiredAppointments,
  getEffectiveAppointmentStatus,
} from "@/lib/appointments";

function getStartOfDayIso(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getNextDayIso(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Response("Supabase admin is not configured.", { status: 500 });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status")?.trim();
  const fromFilter = url.searchParams.get("from")?.trim();
  const toFilter = url.searchParams.get("to")?.trim();

  const fromIso = fromFilter ? getStartOfDayIso(fromFilter) : null;
  const toExclusiveIso = toFilter ? getNextDayIso(toFilter) : null;

  if (fromFilter && !fromIso) {
    return new Response("Invalid from date.", { status: 400 });
  }
  if (toFilter && !toExclusiveIso) {
    return new Response("Invalid to date.", { status: 400 });
  }

  let query = admin
    .from("appointments")
    .select("id, starts_at, ends_at, status, reason, doctor_profile_id, canceled_at")
    .eq("patient_user_id", session.user.id)
    .order("starts_at", { ascending: false });

  if (fromIso) {
    query = query.gte("starts_at", fromIso);
  }
  if (toExclusiveIso) {
    query = query.lt("starts_at", toExclusiveIso);
  }

  const { data, error } = await query;

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
        canceled_at?: string | null;
      }>).map((row) => ({
        id: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        canceledAt: row.canceled_at ?? null,
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
    canceled_at: string | null;
  }>) {
    const normalizedStatus = getEffectiveAppointmentStatus({
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      canceledAt: row.canceled_at,
    });

    if (statusFilter && statusFilter !== "all" && normalizedStatus !== statusFilter) {
      continue;
    }

    const escapedReason = (row.reason ?? "").replaceAll('"', '""');
    lines.push(
      [
        row.id,
        row.doctor_profile_id ?? "",
        row.starts_at,
        row.ends_at ?? "",
        normalizedStatus,
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
