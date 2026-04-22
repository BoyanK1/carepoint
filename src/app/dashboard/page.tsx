import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profiles";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  const profile = await getUserProfile(session.user.id);
  const displayName =
    profile?.full_name || session.user.name || session.user.email || "Account";

  return (
    <DashboardClient
      displayName={displayName}
      email={session.user.email}
      avatarName={profile?.full_name || session.user.name}
      avatarUrl={profile?.avatar_url}
      role={profile?.role}
      city={profile?.city}
    />
  );
}
