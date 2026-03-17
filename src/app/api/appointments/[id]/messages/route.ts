import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { resolveAppointmentAccess } from "@/lib/appointment-access";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";
import { createNotification } from "@/lib/notifications";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const CHAT_WINDOW_SECONDS = 10 * 60;
const CHAT_MAX_REQUESTS = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid appointment ID." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const { data: messages, error } = await admin
    .from("appointment_messages")
    .select("id, sender_user_id, message, created_at")
    .eq("appointment_id", id)
    .order("created_at", { ascending: true })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const senderIds = Array.from(
    new Set(
      ((messages ?? []) as Array<{ sender_user_id: string }>).map((item) => item.sender_user_id)
    )
  );

  const { data: senderProfiles } = senderIds.length
    ? await admin.from("user_profiles").select("id, full_name").in("id", senderIds)
    : { data: [] };

  const senderMap = new Map(
    ((senderProfiles ?? []) as Array<{ id: string; full_name: string | null }>).map((item) => [
      item.id,
      item.full_name || "User",
    ])
  );

  return NextResponse.json({
    messages: ((messages ?? []) as Array<{
      id: string;
      sender_user_id: string;
      message: string;
      created_at: string;
    }>).map((item) => ({
      id: item.id,
      senderUserId: item.sender_user_id,
      senderName: senderMap.get(item.sender_user_id) || "User",
      message: item.message,
      createdAt: item.created_at,
      mine: item.sender_user_id === session.user.id,
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid appointment ID." }, { status: 400 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "appointments_chat",
    identifier: `${session.user.id}:${getClientIdentifier(request)}`,
    windowSeconds: CHAT_WINDOW_SECONDS,
    maxRequests: CHAT_MAX_REQUESTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a little." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message ?? "").trim();

  if (message.length < 1 || message.length > 2000) {
    return NextResponse.json(
      { error: "Message must be between 1 and 2000 characters." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin is not configured." }, { status: 500 });
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const { data: inserted, error } = await admin
    .from("appointment_messages")
    .insert({
      appointment_id: id,
      sender_user_id: session.user.id,
      message,
    })
    .select("id, sender_user_id, message, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message || "Could not send message." }, { status: 500 });
  }

  const recipientId =
    access.isPatient && access.doctorUserId
      ? access.doctorUserId
      : !access.isPatient && access.appointment.patient_user_id
        ? access.appointment.patient_user_id
        : null;

  if (recipientId && recipientId !== session.user.id) {
    await createNotification(admin, {
      userId: recipientId,
      category: "chat",
      title: "New appointment message",
      message: `${profile?.full_name || session.user.name || "Patient"} sent you a new message.`,
      entityType: "appointment",
      entityId: id,
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    message: {
      id: inserted.id,
      senderUserId: inserted.sender_user_id,
      senderName: profile?.full_name || session.user.name || "User",
      message: inserted.message,
      createdAt: inserted.created_at,
      mine: true,
    },
  });
}
