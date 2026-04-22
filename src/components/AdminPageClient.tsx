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

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("adminAuditBadge")}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {t("adminAuditTitle")}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                {t("adminAuditSubtitle")}
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {t("adminAuditRecords").replace("{count}", String(filteredLogs.length))}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 md:grid-cols-4 md:items-end">
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("adminAuditAction")}
              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value as "all" | "approved" | "rejected")
                }
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="all">{t("statusAll")}</option>
                <option value="approved">{t("adminAuditApproved")}</option>
                <option value="rejected">{t("adminAuditRejected")}</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("historyFrom")}
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("historyTo")}
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("adminAuditSearch")}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                placeholder={t("adminAuditSearchPlaceholder")}
              />
            </label>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
              {t("adminAuditEmpty")}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredLogs.map((item) => {
                const approved = item.action === "application_approved";
                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm shadow-slate-100/70"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            approved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }`}
                        >
                          {approved ? t("adminAuditApproved") : t("adminAuditRejected")}
                        </span>
                        <p className="mt-3 break-words font-semibold text-slate-900">
                          {t("adminAuditApplicant")}{" "}
                          {item.target_name || t("commonNotAvailable")}
                        </p>
                        <p className="mt-1 break-words text-slate-600">
                          {t("adminAuditBy")} {item.admin_name}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs font-medium text-slate-500 sm:text-right">
                        {new Date(item.created_at).toLocaleString(locale)}
                      </time>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
