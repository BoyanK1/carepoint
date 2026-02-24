import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserProfile } from "@/lib/profiles";
import { AdminPageClient } from "@/components/AdminPageClient";
import type { Application } from "@/components/AdminApplications";
import type { AdminAuditLog } from "@/components/AdminPageClient";

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
    return <AdminPageClient applications={[]} auditLogs={[]} missingAdminKey />;
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

  const { data: logsData } = await admin
    .from("admin_audit_logs")
    .select("id, action, created_at, admin_user_id, target_user_id")
    .order("created_at", { ascending: false })
    .limit(25);

  const actorIds = Array.from(
    new Set(
      (logsData ?? []).flatMap((item) =>
        [item.admin_user_id, item.target_user_id].filter((value): value is string =>
          Boolean(value)
        )
      )
    )
  );

  const { data: actorProfiles } = actorIds.length
    ? await admin
        .from("user_profiles")
        .select("id, full_name")
        .in("id", actorIds)
    : { data: [] };

  const actorMap = new Map(
    ((actorProfiles ?? []) as Array<{ id: string; full_name: string | null }>).map(
      (profile) => [profile.id, profile.full_name || profile.id]
    )
  );

  const auditLogs: AdminAuditLog[] = ((logsData ?? []) as Array<{
    id: string;
    action: string;
    created_at: string;
    admin_user_id: string;
    target_user_id: string | null;
  }>).map((item) => ({
    id: item.id,
    action: item.action,
    created_at: item.created_at,
    admin_name: actorMap.get(item.admin_user_id) || item.admin_user_id,
    target_name: item.target_user_id
      ? actorMap.get(item.target_user_id) || item.target_user_id
      : "N/A",
  }));

  return (
    <AdminPageClient
      applications={applications}
      auditLogs={auditLogs}
      missingAdminKey={false}
    />
  );
}
