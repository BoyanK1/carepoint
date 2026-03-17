import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { resolveAppointmentAccess } from "@/lib/appointment-access";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

function toIcsDate(value: string) {
  return value.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return new Response("Invalid appointment ID.", { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Response("Supabase admin is not configured.", { status: 500 });
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return new Response("Appointment not found.", { status: 404 });
  }

  const startIso = new Date(access.appointment.starts_at).toISOString();
  const endIso = access.appointment.ends_at
    ? new Date(access.appointment.ends_at).toISOString()
    : new Date(new Date(access.appointment.starts_at).getTime() + 30 * 60 * 1000).toISOString();

  const title = "CarePoint Doctor Appointment";
  const description = access.appointment.reason
    ? `Reason: ${access.appointment.reason}`
    : "Booked via CarePoint.";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CarePoint//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${id}@carepoint`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(startIso)}`,
    `DTEND:${toIcsDate(endIso)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, " ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=carepoint-appointment-${id}.ics`,
      "Cache-Control": "no-store",
    },
  });
}
