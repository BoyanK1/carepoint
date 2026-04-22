"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface AppointmentItem {
  id: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  reason: string | null;
  access?: {
    isPatient: boolean;
    isDoctor: boolean;
  };
  patient: {
    id: string;
    name: string;
    city: string | null;
    avatarUrl: string | null;
  } | null;
  doctor: {
    id: string;
    userId: string;
    name: string;
    specialty: string | null;
    city: string | null;
    avatarUrl: string | null;
    isFavorite: boolean;
  } | null;
}

const filters = ["all", "scheduled", "confirmed", "completed", "cancelled"] as const;

const statusClasses: Record<string, string> = {
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

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

export default function AppointmentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";

  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [reschedule, setReschedule] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

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

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const payload = (await response.json()) as {
        appointments?: AppointmentItem[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || t("appointmentsLoadError"));
        return;
      }

      setAppointments(payload.appointments ?? []);
    } catch {
      setError(t("appointmentsLoadError"));
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
      void loadAppointments();
    }
  }, [status, router, loadAppointments]);

  useEffect(() => {
    const tick = () => setCurrentTime(Date.now());
    tick();
    const intervalId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return appointments;
    }
    return appointments.filter((item) => item.status === filter);
  }, [appointments, filter]);

  const stats = useMemo(() => {
    let active = 0;
    let completed = 0;

    for (const item of appointments) {
      if (item.status === "scheduled" || item.status === "confirmed") {
        active += 1;
      }
      if (item.status === "completed") {
        completed += 1;
      }
    }

    return {
      total: appointments.length,
      active,
      completed,
    };
  }, [appointments]);

  async function updateAppointment(id: string, action: "cancel" | "reschedule") {
    setPendingId(id);
    const currentAppointment = appointments.find((item) => item.id === id);
    const startsAt =
      reschedule[id] ??
      (currentAppointment ? toDateTimeLocal(currentAppointment.startsAt) : "");

    if (action === "reschedule" && !startsAt) {
      setError(t("appointmentsUpdateError"));
      setPendingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body:
          action === "cancel"
            ? JSON.stringify({ action })
            : JSON.stringify({ action, startsAt }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error || t("appointmentsUpdateError"));
        return;
      }

      await loadAppointments();
    } catch {
      setError(t("appointmentsUpdateError"));
    } finally {
      setPendingId(null);
    }
  }

  async function toggleFavorite(appointment: AppointmentItem) {
    if (!appointment.doctor) {
      return;
    }

    try {
      const response = await fetch(`/api/doctors/${appointment.doctor.id}/favorite`, {
        method: appointment.doctor.isFavorite ? "DELETE" : "POST",
      });
      if (!response.ok) {
        setError(t("appointmentsUpdateError"));
        return;
      }

      setAppointments((current) =>
        current.map((item) => {
          if (!item.doctor || item.doctor.id !== appointment.doctor?.id) {
            return item;
          }
          return {
            ...item,
            doctor: {
              ...item.doctor,
              isFavorite: !item.doctor.isFavorite,
            },
          };
        })
      );
    } catch {
      setError(t("appointmentsUpdateError"));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t("appointmentsBadge")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("appointmentsTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          {t("appointmentsSubtitle")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t("appointmentsAllRecords")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{t("appointmentsActive")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.active}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t("appointmentsCompleted")}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.completed}</p>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {filters.map((option) => {
            const isActive = filter === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {getStatusLabel(option)}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("appointmentsLoading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          {t("appointmentsEmpty")}
        </div>
      ) : (
        <section className="grid gap-4 lg:gap-5">
          {filtered.map((appointment) => {
            const badgeClass = statusClasses[appointment.status] ?? statusClasses.scheduled;
            const isPastAppointment =
              currentTime > 0 && new Date(appointment.startsAt).getTime() <= currentTime;
            const isDoctorView = Boolean(appointment.access?.isDoctor && !appointment.access?.isPatient);
            const showManageControls =
              (appointment.status === "scheduled" || appointment.status === "confirmed") &&
              !isPastAppointment;
            const primaryName = isDoctorView
              ? appointment.patient?.name || t("appointmentsPatientFallback")
              : appointment.doctor?.name || t("appointmentsDoctorFallback");
            const secondaryParts = isDoctorView
              ? [
                  t("appointmentsBookedWithYou"),
                  appointment.patient?.city,
                  appointment.doctor?.specialty,
                ]
              : [
                  appointment.doctor?.specialty,
                  appointment.doctor?.city,
                ];
            return (
              <article
                key={appointment.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeClass}`}
                    >
                      {getStatusLabel(appointment.status)}
                    </span>
                    <p className="text-lg font-semibold text-slate-900 sm:text-xl">
                      {formatDate(appointment.startsAt, locale)}
                    </p>
                    <p className="text-sm text-slate-700">
                      {primaryName}
                      {secondaryParts.filter(Boolean).map((part) => ` · ${part}`).join("")}
                    </p>
                    <p className="text-sm text-slate-500">{appointment.reason || t("appointmentsNoNote")}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(isDoctorView ? appointment.patient : appointment.doctor) && (
                      <Avatar
                        name={
                          isDoctorView
                            ? appointment.patient?.name
                            : appointment.doctor?.name
                        }
                        src={
                          isDoctorView
                            ? appointment.patient?.avatarUrl
                            : appointment.doctor?.avatarUrl
                        }
                        size={42}
                      />
                    )}
                    {appointment.doctor && !isDoctorView && (
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(appointment)}
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                      >
                        {appointment.doctor.isFavorite
                          ? t("appointmentsUnfavorite")
                          : t("appointmentsFavorite")}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <Link
                      href={`/appointments/${appointment.id}`}
                      className="rounded-full bg-slate-900 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      {t("appointmentsDetails")}
                    </Link>
                    <Link
                      href={
                        appointment.doctor
                          ? `/doctors/${appointment.doctor.id}?rebook=1`
                          : "/doctors"
                      }
                      className="rounded-full border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      {t("appointmentsQuickRebook")}
                    </Link>
                  </div>

                  {showManageControls && (
                    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      {!isDoctorView && (
                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("appointmentsPickNewDateTime")}
                          <input
                            type="datetime-local"
                            value={reschedule[appointment.id] ?? toDateTimeLocal(appointment.startsAt)}
                            onChange={(event) =>
                              setReschedule((current) => ({
                                ...current,
                                [appointment.id]: event.target.value,
                              }))
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-300"
                          />
                        </label>
                      )}

                      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void updateAppointment(appointment.id, "cancel")}
                          disabled={pendingId === appointment.id}
                          className="rounded-full border border-rose-200 bg-white px-3 py-2.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingId === appointment.id
                            ? t("appointmentsPleaseWait")
                            : t("appointmentsCancel")}
                        </button>
                        {!isDoctorView && (
                          <button
                            type="button"
                            onClick={() => void updateAppointment(appointment.id, "reschedule")}
                            disabled={pendingId === appointment.id}
                            className="rounded-full bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {t("appointmentsReschedule")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {!showManageControls &&
                    (appointment.status === "scheduled" || appointment.status === "confirmed") && (
                      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        {t("appointmentsPastNoReschedule")}
                      </p>
                    )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
