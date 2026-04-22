import type { SupabaseClient } from "@supabase/supabase-js";
import {
  completeExpiredAppointments,
  getEffectiveAppointmentStatus,
} from "@/lib/appointments";
import { decryptSensitiveText } from "@/lib/security/encryption";

export interface AppointmentAccessRow {
  id: string;
  patient_user_id: string | null;
  doctor_profile_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  reason: string | null;
  payment_status: string | null;
  deposit_amount: number | null;
  paid_at: string | null;
}

export interface AppointmentAccessResult {
  appointment: AppointmentAccessRow;
  doctorUserId: string | null;
  canAccess: boolean;
  isPatient: boolean;
  isDoctor: boolean;
}

export async function resolveAppointmentAccess(
  admin: SupabaseClient,
  appointmentId: string,
  userId: string,
  isAdmin: boolean
): Promise<AppointmentAccessResult | null> {
  const { data: appointmentData, error: appointmentError } = await admin
    .from("appointments")
    .select(
      "id, patient_user_id, doctor_profile_id, starts_at, ends_at, status, reason, payment_status, deposit_amount, paid_at"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError || !appointmentData) {
    return null;
  }

  const appointment = appointmentData as AppointmentAccessRow;
  appointment.reason = decryptSensitiveText(appointment.reason);
  const normalizedStatus = getEffectiveAppointmentStatus({
    id: appointment.id,
    startsAt: appointment.starts_at,
    endsAt: appointment.ends_at,
    status: appointment.status,
  });

  if (normalizedStatus !== appointment.status) {
    await completeExpiredAppointments(admin, [
      {
        id: appointment.id,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
        status: appointment.status,
      },
    ]).catch(() => null);
    appointment.status = normalizedStatus;
  }

  let doctorUserId: string | null = null;
  if (appointment.doctor_profile_id) {
    const { data: doctorProfile } = await admin
      .from("doctor_profiles")
      .select("user_id")
      .eq("id", appointment.doctor_profile_id)
      .maybeSingle();

    doctorUserId = (doctorProfile?.user_id as string | null) ?? null;
  }

  const isPatient = appointment.patient_user_id === userId;
  const isDoctor = Boolean(doctorUserId && doctorUserId === userId);

  return {
    appointment,
    doctorUserId,
    canAccess: isAdmin || isPatient || isDoctor,
    isPatient,
    isDoctor,
  };
}
