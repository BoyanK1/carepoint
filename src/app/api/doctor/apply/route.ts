import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  detectMimeType,
  type DetectedMimeType,
} from "@/lib/security/file-signature";

const MAX_LICENSE_BYTES = 8 * 1024 * 1024;
const ALLOWED_LICENSE_TYPES: Partial<Record<DetectedMimeType, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

  if (specialty.length > 120 || city.length > 120) {
    return NextResponse.json(
      { error: "Specialty and city must be under 120 characters." },
      { status: 400 }
    );
  }

  if (license.size > MAX_LICENSE_BYTES) {
    return NextResponse.json(
      { error: "License file is too large. Max size is 8MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await license.arrayBuffer());
  const detectedMimeType = detectMimeType(buffer);
  if (!detectedMimeType || !ALLOWED_LICENSE_TYPES[detectedMimeType]) {
    return NextResponse.json(
      { error: "Unsupported license file type." },
      { status: 400 }
    );
  }

  const extension = ALLOWED_LICENSE_TYPES[detectedMimeType];
  const filePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const upload = await admin.storage
    .from("doctor-licenses")
    .upload(filePath, buffer, {
      contentType: detectedMimeType,
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
