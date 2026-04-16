import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profiles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { NavbarClient } from "@/components/NavbarClient";

export async function Navbar() {
  const session = await getServerSession(authOptions);
  const admin = getSupabaseAdmin();
  const [profile, unreadCount] = session?.user?.id
    ? await Promise.all([
        getUserProfile(session.user.id),
        admin ? getUnreadNotificationCount(admin, session.user.id).catch(() => 0) : 0,
      ])
    : [null, 0];

  const user = session?.user
    ? {
        name: profile?.full_name ?? session.user.name,
        email: session.user.email,
        avatarUrl: profile?.avatar_url ?? null,
        role: profile?.role ?? null,
      }
    : null;

  return <NavbarClient user={user} initialUnreadCount={unreadCount} />;
}
