import { getSupabaseAdmin } from "@/lib/supabase/admin";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  city: string | null;
  avatar_url: string | null;
}

export async function getUserProfile(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data } = await admin
    .from("user_profiles")
    .select("id, full_name, email, role, city, avatar_url")
    .eq("id", userId)
    .single();

  return (data as UserProfile | null) ?? null;
}
