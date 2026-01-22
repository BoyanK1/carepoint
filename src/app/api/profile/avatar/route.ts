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
  const avatar = formData.get("avatar");

  if (!(avatar instanceof File)) {
    return NextResponse.json({ error: "Avatar file is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await avatar.arrayBuffer());
  const filePath = `${session.user.id}/${Date.now()}-${avatar.name}`;

  const upload = await admin.storage.from("avatars").upload(filePath, buffer, {
    contentType: avatar.type,
    upsert: true,
  });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 500 });
  }

  const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(filePath);

  const { error } = await admin.from("user_profiles").upsert({
    id: session.user.id,
    avatar_url: publicUrl.publicUrl,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: publicUrl.publicUrl });
}
