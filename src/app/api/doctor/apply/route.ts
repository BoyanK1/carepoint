import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
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

  const formData = await request.formData();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const license = formData.get("license");

  if (!specialty || !city || !(license instanceof File)) {
    return NextResponse.json(
      { error: "Specialty, city, and license are required." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await license.arrayBuffer());
  const filePath = `${session.user.id}/${Date.now()}-${license.name}`;

  const upload = await admin.storage
    .from("doctor-licenses")
    .upload(filePath, buffer, {
      contentType: license.type,
      upsert: false,
    });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { error } = await admin.from("doctor_applications").insert({
    user_id: session.user.id,
    specialty,
    city,
    license_path: filePath,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("user_profiles")
    .upsert({ id: session.user.id, role: "doctor_pending" });

  return NextResponse.json({ ok: true });
}
