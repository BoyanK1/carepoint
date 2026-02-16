"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { AdminApplications, type Application } from "@/components/AdminApplications";

export interface AdminAuditLog {
  id: string;
  action: string;
  created_at: string;
  admin_name: string;
  target_name: string;
}

interface AdminPageClientProps {
  applications: Application[];
  auditLogs: AdminAuditLog[];
  missingAdminKey: boolean;
}

export function AdminPageClient({
  applications,
  auditLogs,
  missingAdminKey,
}: AdminPageClientProps) {
  const { t } = useLanguage();

  if (missingAdminKey) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-slate-900">{t("adminBadge")}</h1>
        <p className="text-slate-600">{t("adminMissingKey")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("adminBadge")}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("adminTitle")}</h1>
        <p className="text-slate-600">{t("adminSubtitle")}</p>
      </header>

      <AdminApplications applications={applications} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin activity
          </p>
          <h2 className="text-xl font-semibold text-slate-900">Audit log</h2>
          <p className="text-sm text-slate-600">
            Track who approved or rejected doctor applications.
          </p>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-500">No audit records yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-slate-800">
                  {item.action === "application_approved" ? "Approved" : "Rejected"} by{" "}
                  {item.admin_name}
                </p>
                <p className="text-slate-600">
                  Applicant: {item.target_name} ·{" "}
                  {new Date(item.created_at).toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
