"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

interface AvailabilityRow {
  doctor_profile_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active?: boolean;
}

interface ScheduleRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
}

const DEFAULT_ROWS: ScheduleRow[] = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "17:00",
  slotMinutes: 30,
  isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
}));

function toInputTime(value: string) {
  return value.slice(0, 5);
}

function mergeRows(availability: AvailabilityRow[]) {
  return DEFAULT_ROWS.map((defaultRow) => {
    const existing = availability.find((row) => row.day_of_week === defaultRow.dayOfWeek);
    if (!existing) {
      return defaultRow;
    }

    return {
      dayOfWeek: existing.day_of_week,
      startTime: toInputTime(existing.start_time),
      endTime: toInputTime(existing.end_time),
      slotMinutes: existing.slot_minutes,
      isActive: existing.is_active !== false,
    };
  });
}

export default function DoctorSchedulePage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";
  const [rows, setRows] = useState<ScheduleRow[]>(DEFAULT_ROWS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dayLabels = Array.from({ length: 7 }, (_, day) =>
    new Date(Date.UTC(2026, 0, 4 + day)).toLocaleDateString(locale, {
      weekday: "long",
    })
  );

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/doctor/availability", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | { availability?: AvailabilityRow[]; error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.error || t("doctorScheduleLoadError"));
        return;
      }

      setRows(mergeRows(payload?.availability ?? []));
    } catch {
      setError(t("doctorScheduleLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }

    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadSchedule();
    }
  }, [loadSchedule, router, status]);

  function updateRow(dayOfWeek: number, updates: Partial<ScheduleRow>) {
    setRows((current) =>
      current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...updates } : row))
    );
  }

  async function saveSchedule() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/doctor/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: rows }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error || t("doctorScheduleSaveError"));
        return;
      }

      setMessage(t("doctorScheduleSaved"));
      await loadSchedule();
    } catch {
      setError(t("doctorScheduleSaveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t("doctorScheduleBadge")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("doctorScheduleTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t("doctorScheduleSubtitle")}
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
          <p className="text-sm text-slate-600">{t("doctorScheduleHelp")}</p>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-slate-500">{t("doctorScheduleLoading")}</div>
        ) : (
          <div className="grid gap-3 p-4 sm:p-5">
            {rows.map((row) => (
              <article
                key={row.dayOfWeek}
                className={`grid gap-4 rounded-2xl border p-4 transition ${
                  row.isActive
                    ? "border-slate-200 bg-white"
                    : "border-slate-100 bg-slate-50/70"
                } lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:items-end`}
              >
                <div className="flex items-center justify-between gap-3 lg:block">
                  <p className="text-base font-semibold capitalize text-slate-900">
                    {dayLabels[row.dayOfWeek]}
                  </p>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 lg:mt-3">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) =>
                        updateRow(row.dayOfWeek, { isActive: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    {t("doctorScheduleActive")}
                  </label>
                </div>

                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("doctorScheduleStart")}
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(event) =>
                      updateRow(row.dayOfWeek, { startTime: event.target.value })
                    }
                    disabled={!row.isActive}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("doctorScheduleEnd")}
                  <input
                    type="time"
                    value={row.endTime}
                    onChange={(event) =>
                      updateRow(row.dayOfWeek, { endTime: event.target.value })
                    }
                    disabled={!row.isActive}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("doctorScheduleSlot")}
                  <select
                    value={row.slotMinutes}
                    onChange={(event) =>
                      updateRow(row.dayOfWeek, { slotMinutes: Number(event.target.value) })
                    }
                    disabled={!row.isActive}
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {[15, 20, 30, 45, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {t("doctorScheduleMinutes").replace("{count}", String(minutes))}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 p-4 sm:p-5">
          <button
            type="button"
            onClick={() => void saveSchedule()}
            disabled={loading || saving}
            className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? t("doctorScheduleSaving") : t("doctorScheduleSave")}
          </button>
          {message && <p className="mt-3 text-sm font-medium text-emerald-600">{message}</p>}
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        </div>
      </section>
    </div>
  );
}
