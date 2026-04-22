import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profiles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/security/request-guard";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const DAYS_IN_WEEK = 7;

interface AvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
}

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function normalizeTime(value: string) {
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
}

async function getDoctorProfileId(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { admin: null, doctorProfileId: null, error: "Supabase admin is not configured." };
  }

  const profile = await getUserProfile(userId);
  if (profile?.role !== "doctor") {
    return { admin, doctorProfileId: null, error: "Doctor access required." };
  }

  const { data, error } = await admin
    .from("doctor_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("verified", true)
    .maybeSingle();

  if (error) {
    return { admin, doctorProfileId: null, error: error.message };
  }

  if (!data?.id) {
    return { admin, doctorProfileId: null, error: "Verified doctor profile not found." };
  }

  return { admin, doctorProfileId: data.id as string, error: null };
}

function parseRows(value: unknown) {
  if (!Array.isArray(value)) {
    return { rows: null, error: "Availability rows are required." };
  }

  if (value.length > DAYS_IN_WEEK) {
    return { rows: null, error: "Only one schedule row per weekday is allowed." };
  }

  const seenDays = new Set<number>();
  const rows: AvailabilityInput[] = [];

  for (const raw of value) {
    const item = raw as Partial<AvailabilityInput>;
    const dayOfWeek = Number(item.dayOfWeek);
    const startTime = String(item.startTime ?? "").trim();
    const endTime = String(item.endTime ?? "").trim();
    const slotMinutes = Number(item.slotMinutes);
    const isActive = Boolean(item.isActive);

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { rows: null, error: "Invalid weekday." };
    }
    if (seenDays.has(dayOfWeek)) {
      return { rows: null, error: "Duplicate weekday in schedule." };
    }
    seenDays.add(dayOfWeek);

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      return { rows: null, error: "Invalid time format." };
    }
    if (!Number.isInteger(slotMinutes) || slotMinutes < 10 || slotMinutes > 180) {
      return { rows: null, error: "Slot length must be between 10 and 180 minutes." };
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);
    if (endMinutes <= startMinutes) {
      return { rows: null, error: "End time must be after start time." };
    }
    if (slotMinutes > endMinutes - startMinutes) {
      return { rows: null, error: "Slot length is longer than the working window." };
    }

    rows.push({
      dayOfWeek,
      startTime: normalizeTime(startTime),
      endTime: normalizeTime(endTime),
      slotMinutes,
      isActive,
    });
  }

  return { rows, error: null };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { admin, doctorProfileId, error } = await getDoctorProfileId(session.user.id);
  if (!admin) {
    return NextResponse.json({ error }, { status: 500 });
  }
  if (!doctorProfileId) {
    return NextResponse.json({ error }, { status: error === "Doctor access required." ? 403 : 404 });
  }

  const { data, error: availabilityError } = await admin
    .from("doctor_availability")
    .select("doctor_profile_id, day_of_week, start_time, end_time, slot_minutes, is_active")
    .eq("doctor_profile_id", doctorProfileId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (availabilityError) {
    return NextResponse.json({ error: availabilityError.message }, { status: 500 });
  }

  return NextResponse.json({
    doctorProfileId,
    availability: data ?? [],
  });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { admin, doctorProfileId, error } = await getDoctorProfileId(session.user.id);
  if (!admin) {
    return NextResponse.json({ error }, { status: 500 });
  }
  if (!doctorProfileId) {
    return NextResponse.json({ error }, { status: error === "Doctor access required." ? 403 : 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseRows(body?.availability);
  if (!parsed.rows) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { error: deleteError } = await admin
    .from("doctor_availability")
    .delete()
    .eq("doctor_profile_id", doctorProfileId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const rows = parsed.rows.map((row) => ({
    doctor_profile_id: doctorProfileId,
    day_of_week: row.dayOfWeek,
    start_time: row.startTime,
    end_time: row.endTime,
    slot_minutes: row.slotMinutes,
    is_active: row.isActive,
  }));

  if (rows.length > 0) {
    const { error: insertError } = await admin.from("doctor_availability").insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
