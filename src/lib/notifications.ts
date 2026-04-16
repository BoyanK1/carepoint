import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

type SupabaseLikeAdmin = SupabaseClient;

interface NotificationInput {
  userId: string;
  category: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

interface EmailInput {
  to: string;
  subject: string;
  text: string;
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function createNotification(
  admin: SupabaseLikeAdmin,
  input: NotificationInput
) {
  await admin.from("notifications").insert({
    user_id: input.userId,
    category: input.category,
    title: input.title,
    message: input.message,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });
}

export async function createManyNotifications(
  admin: SupabaseLikeAdmin,
  items: NotificationInput[]
) {
  if (items.length === 0) {
    return;
  }
  await admin.from("notifications").insert(
    items.map((item) => ({
      user_id: item.userId,
      category: item.category,
      title: item.title,
      message: item.message,
      entity_type: item.entityType ?? null,
      entity_id: item.entityId ?? null,
    }))
  );
}

export async function sendStatusEmail(input: EmailInput) {
  if (!resend) {
    return;
  }

  await resend.emails.send({
    from: "CarePoint <onboarding@resend.dev>",
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}

export async function getUnreadNotificationCount(
  admin: SupabaseLikeAdmin,
  userId: string
) {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
