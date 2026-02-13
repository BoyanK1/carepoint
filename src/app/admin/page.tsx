import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { getServerTranslations } from "@/lib/i18n-server";
import { AdminApplications, type Application } from "@/components/AdminApplications";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth");
  }

  const t = await getServerTranslations();
  const profile = await getUserProfile(session.user.id);
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-slate-900">{t.adminBadge}</h1>
        <p className="text-slate-600">{t.adminMissingKey}</p>
      </div>
    );
  }

  const { data } = await admin
    .from("doctor_applications")
    .select("id, specialty, city, license_url, license_path, status, user_id")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });

  const applications = await Promise.all(
    (data ?? []).map(async (application) => {
      let licenseUrl = application.license_url as string | null;
      const licensePath = application.license_path as string | null;

      if (!licenseUrl && licensePath) {
        const { data: signed, error } = await admin.storage
          .from("doctor-licenses")
          .createSignedUrl(licensePath, 600);
        if (!error) {
          licenseUrl = signed.signedUrl;
        }
      }

      const id =
        typeof application.id === "string" && application.id !== "null"
          ? application.id
          : "";

      return {
        id,
        specialty: application.specialty,
        city: application.city,
        license_url: licenseUrl,
        status: application.status,
        user_id: application.user_id,
      } as Application;
    })
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.adminBadge}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{t.adminTitle}</h1>
        <p className="text-slate-600">{t.adminSubtitle}</p>
      </header>

      <AdminApplications applications={applications} />
    </div>
  );
}
