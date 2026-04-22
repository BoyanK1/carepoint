"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { AdminApplications, type Application } from "@/components/AdminApplications";

export interface AdminAuditLog {
  id: string;
  action: string;
  created_at: string;
  admin_name: string;
  target_name: string | null;
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
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";
  const [actionFilter, setActionFilter] = useState<"all" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((item) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        item.admin_name.toLowerCase().includes(normalizedSearch) ||
        (item.target_name ?? "").toLowerCase().includes(normalizedSearch);

      const isApproved = item.action === "application_approved";
      const isRejected = item.action === "application_rejected";
      const matchesAction =
        actionFilter === "all" ||
        (actionFilter === "approved" && isApproved) ||
        (actionFilter === "rejected" && isRejected);

      const createdAt = new Date(item.created_at).getTime();
      const fromValid = fromDate ? createdAt >= new Date(`${fromDate}T00:00:00`).getTime() : true;
      const toValid = toDate ? createdAt <= new Date(`${toDate}T23:59:59`).getTime() : true;

      return matchesSearch && matchesAction && fromValid && toValid;
    });
  }, [actionFilter, auditLogs, fromDate, search, toDate]);

  if (missingAdminKey) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-slate-900">{t("adminBadge")}</h1>
        <p className="text-slate-600">{t("adminMissingKey")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("adminBadge")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("adminTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t("adminSubtitle")}</p>
      </header>

      <AdminApplications applications={applications} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("adminAuditBadge")}
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{t("adminAuditTitle")}</h2>
          <p className="text-sm text-slate-600">
            {t("adminAuditSubtitle")}
          </p>
        </div>
        <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4 md:items-end">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("adminAuditAction")}
            <select
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value as "all" | "approved" | "rejected")
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            >
              <option value="all">{t("statusAll")}</option>
              <option value="approved">{t("adminAuditApproved")}</option>
              <option value="rejected">{t("adminAuditRejected")}</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("historyFrom")}
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("historyTo")}
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("adminAuditSearch")}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
              placeholder={t("adminAuditSearchPlaceholder")}
            />
          </label>
        </div>
        {filteredLogs.length === 0 ? (
          <p className="text-sm text-slate-500">{t("adminAuditEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-slate-800">
                  {(item.action === "application_approved"
                    ? t("adminAuditApproved")
                    : t("adminAuditRejected")) + " " + t("adminAuditBy")} {item.admin_name}
                </p>
                <p className="text-slate-600">
                  {t("adminAuditApplicant")} {item.target_name || t("commonNotAvailable")} ·{" "}
                  {new Date(item.created_at).toLocaleString(locale)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
