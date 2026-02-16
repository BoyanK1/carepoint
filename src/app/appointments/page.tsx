"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";

interface AppointmentItem {
  id: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  reason: string | null;
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

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AppointmentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [reschedule, setReschedule] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/appointments", { cache: "no-store" });
    const payload = (await response.json()) as {
      appointments?: AppointmentItem[];
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Could not load appointments.");
      setLoading(false);
      return;
    }

    setAppointments(payload.appointments ?? []);
    setLoading(false);
  }, []);

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

  const filtered = useMemo(() => {
    if (filter === "all") {
      return appointments;
    }
    return appointments.filter((item) => item.status === filter);
  }, [appointments, filter]);

  async function updateAppointment(id: string, action: "cancel" | "reschedule") {
    setPendingId(id);
    const response = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body:
        action === "cancel"
          ? JSON.stringify({ action })
          : JSON.stringify({ action, startsAt: reschedule[id] }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error || "Could not update appointment.");
      setPendingId(null);
      return;
    }

    setPendingId(null);
    await loadAppointments();
  }

  async function toggleFavorite(appointment: AppointmentItem) {
    if (!appointment.doctor) {
      return;
    }

    const response = await fetch(`/api/doctors/${appointment.doctor.id}/favorite`, {
      method: appointment.doctor.isFavorite ? "DELETE" : "POST",
    });
    if (!response.ok) {
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
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Patient tools
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">My appointments</h1>
        <p className="text-slate-600">
          Cancel or reschedule visits, and quickly rebook with your favorite doctors.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-slate-700">
          Filter
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No appointments found.
        </div>
      ) : (
        <section className="grid gap-4">
          {filtered.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {appointment.status}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {new Date(appointment.startsAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600">
                    {appointment.doctor?.name || "Doctor"} · {appointment.doctor?.specialty || "N/A"}
                  </p>
                  <p className="text-sm text-slate-500">{appointment.reason || "No note"}</p>
                </div>

                <div className="flex items-center gap-3">
                  {appointment.doctor && (
                    <Avatar
                      name={appointment.doctor.name}
                      src={appointment.doctor.avatarUrl}
                      size={40}
                    />
                  )}
                  {appointment.doctor && (
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(appointment)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      {appointment.doctor.isFavorite ? "Unfavorite" : "Favorite"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={appointment.doctor ? `/doctors/${appointment.doctor.id}?rebook=1` : "/doctors"}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Quick rebook
                </Link>

                {(appointment.status === "scheduled" || appointment.status === "confirmed") && (
                  <>
                    <button
                      type="button"
                      onClick={() => void updateAppointment(appointment.id, "cancel")}
                      disabled={pendingId === appointment.id}
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 disabled:opacity-60"
                    >
                      {pendingId === appointment.id ? "Please wait..." : "Cancel"}
                    </button>

                    <input
                      type="datetime-local"
                      value={reschedule[appointment.id] ?? toDateTimeLocal(appointment.startsAt)}
                      onChange={(event) =>
                        setReschedule((current) => ({
                          ...current,
                          [appointment.id]: event.target.value,
                        }))
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => void updateAppointment(appointment.id, "reschedule")}
                      disabled={pendingId === appointment.id}
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      Reschedule
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
