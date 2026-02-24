import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getAuthUserEmail(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    return null;
  }

  return data.user?.email ?? null;
}
