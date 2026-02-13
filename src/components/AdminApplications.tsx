"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export interface Application {
  id: string;
  specialty: string | null;
  city: string | null;
  license_url: string | null;
  status: string;
  user_id: string | null;
}

interface AdminApplicationsProps {
  applications: Application[];
}

export function AdminApplications({ applications }: AdminApplicationsProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState(applications);
  const [error, setError] = useState<string | null>(null);
  const validItems = items.filter(
    (item) => Boolean(item.id) && item.id !== "undefined" && item.id !== "null"
  );

  const updateStatus = async (id: string, action: "approve" | "reject") => {
    setError(null);

    if (!id) {
      setError(t("adminMissingId"));
      return;
    }

    const response = await fetch(`/api/admin/applications/${id}/${action}`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error || t("adminActionFailed"));
      return;
    }

    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (validItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
        {t("adminNoApps")}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {validItems.map((application) => (
        <div
          key={application.id}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {application.specialty || t("adminUnknownSpecialty")} ·{" "}
                {application.city || t("adminUnknownCity")}
              </p>
              <p className="text-xs text-slate-500">
                {t("adminApplicantId")} {application.user_id ?? t("commonNotAvailable")}
              </p>
              {application.license_url && (
                <a
                  href={application.license_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-slate-700 underline"
                >
                  {t("adminViewLicense")}
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(application.id, "approve")}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
              >
                {t("adminApprove")}
              </button>
              <button
                onClick={() => updateStatus(application.id, "reject")}
                className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
              >
                {t("adminReject")}
              </button>
            </div>
          </div>
        </div>
      ))}
      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
    </div>
  );
}
