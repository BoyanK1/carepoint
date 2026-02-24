import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/security/request-guard";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

export async function GET() {
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

  const { data, error } = await admin
    .from("notifications")
    .select("id, category, title, message, entity_type, entity_id, is_read, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

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

  const body = await request.json().catch(() => null);
  const markAll = Boolean(body?.markAll);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((value: unknown): value is string =>
        typeof value === "string" && UUID_PATTERN.test(value)
      )
    : [];

  let query = admin.from("notifications").update({ is_read: true }).eq("user_id", session.user.id);

  if (!markAll && ids.length > 0) {
    query = query.in("id", ids);
  }

  if (!markAll && ids.length === 0) {
    return NextResponse.json({ error: "No notifications selected." }, { status: 400 });
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
