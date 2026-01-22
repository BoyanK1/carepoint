import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profiles";
import { NavbarClient } from "@/components/NavbarClient";

export async function Navbar() {
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id
    ? await getUserProfile(session.user.id)
    : null;

  const user = session?.user
    ? {
        name: profile?.full_name ?? session.user.name,
        email: session.user.email,
        avatarUrl: profile?.avatar_url ?? null,
        role: profile?.role ?? null,
      }
    : null;

  return <NavbarClient user={user} />;
}
