import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/security/request-guard";

const MAX_CITY_LENGTH = 120;

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const city = typeof body?.city === "string" ? body.city.trim() : "";

  if (!city) {
    return NextResponse.json({ error: "City is required." }, { status: 400 });
  }

  if (city.length > MAX_CITY_LENGTH) {
    return NextResponse.json(
      { error: "City must be under 120 characters." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { error } = await admin.from("user_profiles").upsert({
    id: session.user.id,
    city,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, city });
}
