"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { AdminApplications, type Application } from "@/components/AdminApplications";

interface AdminPageClientProps {
  applications: Application[];
  missingAdminKey: boolean;
}

export function AdminPageClient({
  applications,
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
    </div>
  );
}
