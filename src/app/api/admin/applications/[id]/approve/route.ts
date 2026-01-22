import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Supabase admin is not configured." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("doctor_applications")
    .update({ status: "approved" })
    .eq("id", params.id)
    .select("user_id, specialty, city")
    .single();

  if (error || !data?.user_id) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }

  await admin.from("doctor_profiles").insert({
    user_id: data.user_id,
    specialty: data.specialty,
    city: data.city,
    verified: true,
  });

  await admin
    .from("user_profiles")
    .update({ role: "doctor" })
    .eq("id", data.user_id);

  return NextResponse.json({ ok: true });
}
