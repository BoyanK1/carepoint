import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  city: string | null;
  avatar_url: string | null;
  email_hash?: string | null;
}

export async function getUserProfile(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data } = await admin
    .from("user_profiles")
    .select("id, full_name, role, city, avatar_url, email_hash")
    .eq("id", userId)
    .single();

  return (data as UserProfile | null) ?? null;
}
