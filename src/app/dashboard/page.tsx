import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/profiles";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  const profile = await getUserProfile(session.user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">
          Welcome back, {profile?.full_name || session.user.name || session.user.email}.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar
              name={profile?.full_name || session.user.name}
              src={profile?.avatar_url}
              size={56}
            />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {profile?.full_name || session.user.name || "Account"}
              </h2>
              <p className="text-sm text-slate-600">{session.user.email}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <p>
              <span className="font-semibold">Role:</span>{" "}
              {profile?.role ?? "patient"}
            </p>
            <p>
              <span className="font-semibold">City:</span>{" "}
              {profile?.city ?? "Not set"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Quick actions
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage your account or apply as a verified doctor.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/profile"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Update profile
            </Link>
            <Link
              href="/doctor/apply"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Apply to be a doctor
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
