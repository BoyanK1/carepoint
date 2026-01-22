import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        full_name: body.name ?? "",
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (admin && data.user) {
    await admin.from("user_profiles").insert({
      id: data.user.id,
      full_name: body.name ?? null,
      email: data.user.email ?? body.email,
      role: "patient",
    });
  }

  return NextResponse.json({ ok: true, user: data.user });
}
