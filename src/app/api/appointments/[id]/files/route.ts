import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { resolveAppointmentAccess } from "@/lib/appointment-access";
import { detectMimeType, type DetectedMimeType } from "@/lib/security/file-signature";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const FILE_BUCKET = "appointment-files";
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const FILE_WINDOW_SECONDS = 10 * 60;
const FILE_MAX_REQUESTS = 20;
const ALLOWED_FILE_TYPES: Partial<Record<DetectedMimeType, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function ensureBucket() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false as const, error: "Supabase admin is not configured." };
  }

  const bucketCheck = await admin.storage.getBucket(FILE_BUCKET);
  if (!bucketCheck.error) {
    return { ok: true as const, admin };
  }

  const message = bucketCheck.error.message.toLowerCase();
  const missingBucket = message.includes("not found") || message.includes("does not exist");
  if (!missingBucket) {
    return { ok: false as const, error: bucketCheck.error.message };
  }

  const createResult = await admin.storage.createBucket(FILE_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: Object.keys(ALLOWED_FILE_TYPES),
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already exists")) {
    return { ok: false as const, error: createResult.error.message };
  }

  return { ok: true as const, admin };
}

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

  const bucket = await ensureBucket();
  if (!bucket.ok) {
    return NextResponse.json({ error: bucket.error }, { status: 500 });
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(bucket.admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const { data: files, error } = await bucket.admin
    .from("appointment_files")
    .select("id, uploader_user_id, storage_path, file_name, mime_type, size_bytes, created_at")
    .eq("appointment_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (files ?? []) as Array<{
    id: string;
    uploader_user_id: string;
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }>;

  const signedItems = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await bucket.admin.storage
        .from(FILE_BUCKET)
        .createSignedUrl(row.storage_path, 900);

      return {
        id: row.id,
        uploaderUserId: row.uploader_user_id,
        fileName: row.file_name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        createdAt: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ files: signedItems });
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
    namespace: "appointments_files",
    identifier: `${session.user.id}:${getClientIdentifier(request)}`,
    windowSeconds: FILE_WINDOW_SECONDS,
    maxRequests: FILE_MAX_REQUESTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many file uploads. Please try again later." },
      { status: 429 }
    );
  }

  const bucket = await ensureBucket();
  if (!bucket.ok) {
    return NextResponse.json({ error: bucket.error }, { status: 500 });
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(bucket.admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Max size is 12MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMimeType(buffer);
  if (!detected || !ALLOWED_FILE_TYPES[detected]) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const extension = ALLOWED_FILE_TYPES[detected];
  const storagePath = `${id}/${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const upload = await bucket.admin.storage.from(FILE_BUCKET).upload(storagePath, buffer, {
    contentType: detected,
    upsert: false,
  });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data: inserted, error } = await bucket.admin
    .from("appointment_files")
    .insert({
      appointment_id: id,
      uploader_user_id: session.user.id,
      storage_path: storagePath,
      file_name: file.name.slice(0, 220),
      mime_type: detected,
      size_bytes: file.size,
    })
    .select("id, uploader_user_id, file_name, mime_type, size_bytes, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message || "Upload failed." }, { status: 500 });
  }

  const { data: signed } = await bucket.admin.storage
    .from(FILE_BUCKET)
    .createSignedUrl(storagePath, 900);

  return NextResponse.json({
    ok: true,
    file: {
      id: inserted.id,
      uploaderUserId: inserted.uploader_user_id,
      fileName: inserted.file_name,
      mimeType: inserted.mime_type,
      sizeBytes: inserted.size_bytes,
      createdAt: inserted.created_at,
      url: signed?.signedUrl ?? null,
    },
  });
}

export async function DELETE(
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

  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim() || "";

  if (!UUID_PATTERN.test(fileId)) {
    return NextResponse.json({ error: "Invalid file ID." }, { status: 400 });
  }

  const bucket = await ensureBucket();
  if (!bucket.ok) {
    return NextResponse.json({ error: bucket.error }, { status: 500 });
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === "admin";

  const access = await resolveAppointmentAccess(bucket.admin, id, session.user.id, isAdmin);
  if (!access || !access.canAccess) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const { data: row, error } = await bucket.admin
    .from("appointment_files")
    .select("id, uploader_user_id, storage_path")
    .eq("id", fileId)
    .eq("appointment_id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (!isAdmin && row.uploader_user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await bucket.admin.storage.from(FILE_BUCKET).remove([row.storage_path]);
  await bucket.admin.from("appointment_files").delete().eq("id", row.id);

  return NextResponse.json({ ok: true });
}
