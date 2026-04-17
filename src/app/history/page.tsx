"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

interface HistoryItem {
  id: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
  canceledAt: string | null;
  doctor: {
    id: string;
    name: string;
    specialty: string | null;
    city: string | null;
  } | null;
}

const statusClasses: Record<string, string> = {
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const getStatusLabel = useCallback(
    (value: string) => {
      switch (value) {
        case "scheduled":
          return t("statusScheduled");
        case "confirmed":
          return t("statusConfirmed");
        case "completed":
          return t("statusCompleted");
        case "cancelled":
          return t("statusCancelled");
        default:
          return t("statusAll");
      }
    },
    [t]
  );

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("status", statusFilter);
    if (fromDate) {
      params.set("from", fromDate);
    }
    if (toDate) {
      params.set("to", toDate);
    }

    try {
      const response = await fetch(`/api/appointments/history?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        history?: HistoryItem[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || t("historyLoadError"));
        return;
      }

      setItems(payload.history ?? []);
    } catch {
      setError(t("historyLoadError"));
    } finally {
      setLoading(false);
    }
  }, [fromDate, statusFilter, t, toDate]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }
    if (status === "authenticated") {
      void loadHistory();
    }
  }, [status, router, loadHistory]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t("historyBadge")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("historyTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">{t("historySubtitle")}</p>
      </header>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("historyStatus")}
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            >
              <option value="all">{t("statusAll")}</option>
              <option value="scheduled">{t("statusScheduled")}</option>
              <option value="confirmed">{t("statusConfirmed")}</option>
              <option value="completed">{t("statusCompleted")}</option>
              <option value="cancelled">{t("statusCancelled")}</option>
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

          <button
            type="button"
            onClick={() => void loadHistory()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t("historyApplyFilters")}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          {t("historyRecordsFound").replace("{count}", String(items.length))}
        </p>
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();
            params.set("status", statusFilter);
            if (fromDate) {
              params.set("from", fromDate);
            }
            if (toDate) {
              params.set("to", toDate);
            }
            window.location.href = `/api/appointments/history/export?${params.toString()}`;
          }}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          {t("historyExportCsv")}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("historyLoading")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          {t("historyEmpty")}
        </div>
      ) : (
        <section className="space-y-4">
          {items.map((item) => {
            const badgeClass = statusClasses[item.status] ?? statusClasses.scheduled;

            return (
              <article
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                    <p className="text-lg font-semibold text-slate-900">{formatDate(item.startsAt, locale)}</p>
                    <p className="text-sm text-slate-700">
                      {item.doctor?.name || t("historyDoctorFallback")}
                      {item.doctor?.specialty ? ` · ${item.doctor.specialty}` : ""}
                      {item.doctor?.city ? ` · ${item.doctor.city}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">{item.reason || t("historyNoNote")}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{t("historyRecordId")}</p>
                    <p className="mt-0.5 max-w-52 truncate font-medium text-slate-600">{item.id}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p>
                    {t("historyLoggedOn").replace(
                      "{date}",
                      new Date(item.createdAt).toLocaleDateString(locale)
                    )}
                  </p>
                  {item.canceledAt ? (
                    <p className="sm:text-right">
                      {t("historyCancelledOn").replace(
                        "{date}",
                        new Date(item.canceledAt).toLocaleDateString(locale)
                      )}
                    </p>
                  ) : (
                    <p className="sm:text-right">
                      {t("historyStatusUpdated").replace("{status}", getStatusLabel(item.status))}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Link
                    href={`/appointments/${item.id}`}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {t("historyOpenAppointment")}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
