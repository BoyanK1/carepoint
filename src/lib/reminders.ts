import type { SupabaseClient } from "@supabase/supabase-js";

const REMINDER_OFFSETS: Record<"24h" | "1h", number> = {
  "24h": 24 * 60 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

export async function syncAppointmentReminders(
  admin: SupabaseClient,
  appointmentId: string,
  startsAtIso: string,
  status: string
) {
  const active = status === "scheduled" || status === "confirmed";

  if (!active) {
    await admin
      .from("appointment_reminders")
      .delete()
      .eq("appointment_id", appointmentId)
      .eq("status", "pending");
    return;
  }

  const startsAt = new Date(startsAtIso);

  const records = (Object.keys(REMINDER_OFFSETS) as Array<"24h" | "1h">).map((type) => ({
    appointment_id: appointmentId,
    reminder_type: type,
    scheduled_for: new Date(startsAt.getTime() - REMINDER_OFFSETS[type]).toISOString(),
    status: "pending" as const,
    sent_at: null,
    error_message: null,
  }));

  await admin.from("appointment_reminders").upsert(records, {
    onConflict: "appointment_id,reminder_type",
  });
}
