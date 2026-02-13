import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { AdminPageClient } from "@/components/AdminPageClient";
import type { Application } from "@/components/AdminApplications";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth");
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return <AdminPageClient applications={[]} missingAdminKey />;
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

  return <AdminPageClient applications={applications} missingAdminKey={false} />;
}
