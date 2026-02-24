import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  detectMimeType,
  type DetectedMimeType,
} from "@/lib/security/file-signature";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";

export const runtime = "nodejs";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_WINDOW_SECONDS = 10 * 60;
const AVATAR_MAX_REQUESTS = 20;
const ALLOWED_AVATAR_TYPES: Partial<Record<DetectedMimeType, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function toAvatarErrorMessage(raw: unknown) {
  if (!(raw instanceof Error)) {
    return "Avatar upload failed.";
  }

  const message = raw.message || "Avatar upload failed.";
  const normalized = message.toLowerCase();

  if (normalized.includes("fetch failed")) {
    return "Could not connect to Supabase. Check your Supabase URL/key and Vercel env variables.";
  }

  return message;
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await consumeRateLimit({
      namespace: "avatar_upload",
      identifier: `${session.user.id}:${getClientIdentifier(request)}`,
      windowSeconds: AVATAR_WINDOW_SECONDS,
      maxRequests: AVATAR_MAX_REQUESTS,
    });

    if (rateLimit.error) {
      return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
    }

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many avatar uploads. Please wait and try again." },
        { status: 429 }
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase admin is not configured." },
        { status: 500 }
      );
    }

    // Create the bucket on first upload if it's missing.
    const bucketCheck = await admin.storage.getBucket(AVATAR_BUCKET);
    if (bucketCheck.error) {
      const bucketError = bucketCheck.error.message.toLowerCase();
      const missingBucket =
        bucketError.includes("not found") || bucketError.includes("does not exist");

      if (!missingBucket) {
        return NextResponse.json({ error: bucketCheck.error.message }, { status: 500 });
      }

      const createBucket = await admin.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: MAX_AVATAR_BYTES,
        allowedMimeTypes: Object.keys(ALLOWED_AVATAR_TYPES),
      });

      if (createBucket.error) {
        const createError = createBucket.error.message.toLowerCase();
        if (!createError.includes("already exists")) {
          return NextResponse.json({ error: createBucket.error.message }, { status: 500 });
        }
      }
    }

    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return NextResponse.json({ error: "Avatar file is required." }, { status: 400 });
    }

    if (avatar.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Avatar is too large. Max size is 2MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await avatar.arrayBuffer());
    const detectedMimeType = detectMimeType(buffer);
    if (!detectedMimeType || !ALLOWED_AVATAR_TYPES[detectedMimeType]) {
      return NextResponse.json(
        { error: "Unsupported avatar file type." },
        { status: 400 }
      );
    }

    const extension = ALLOWED_AVATAR_TYPES[detectedMimeType];
    const filePath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const upload = await admin.storage.from(AVATAR_BUCKET).upload(filePath, buffer, {
      contentType: detectedMimeType,
      upsert: false,
    });

    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const { data: publicUrl } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

    const { error } = await admin.from("user_profiles").upsert({
      id: session.user.id,
      avatar_url: publicUrl.publicUrl,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: publicUrl.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: toAvatarErrorMessage(error) }, { status: 500 });
  }
}
