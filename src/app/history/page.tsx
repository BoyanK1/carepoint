"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
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

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

    const response = await fetch(`/api/appointments/history?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      history?: HistoryItem[];
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Could not load history.");
      setLoading(false);
      return;
    }

    setItems(payload.history ?? []);
    setLoading(false);
  }, [fromDate, statusFilter, toDate]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadHistory();
    }
  }, [status, router, loadHistory]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Patient tools
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Appointment history
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Review past activity, filter by status or date range, and export your appointment records.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
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
            Apply filters
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Records found: <span className="font-semibold text-slate-900">{items.length}</span>
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/appointments/history/export";
          }}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading timeline...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          No records match your filters.
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
                      {item.status}
                    </span>
                    <p className="text-lg font-semibold text-slate-900">{formatDate(item.startsAt)}</p>
                    <p className="text-sm text-slate-700">
                      {item.doctor?.name || "Doctor"}
                      {item.doctor?.specialty ? ` · ${item.doctor.specialty}` : ""}
                      {item.doctor?.city ? ` · ${item.doctor.city}` : ""}
                    </p>
                    <p className="text-sm text-slate-500">{item.reason || "No note added."}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>Record ID</p>
                    <p className="mt-0.5 max-w-52 truncate font-medium text-slate-600">{item.id}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p>
                    Logged on{" "}
                    <span className="font-medium text-slate-700">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                  {item.canceledAt ? (
                    <p className="sm:text-right">
                      Cancelled on{" "}
                      <span className="font-medium text-rose-700">
                        {new Date(item.canceledAt).toLocaleDateString()}
                      </span>
                    </p>
                  ) : (
                    <p className="sm:text-right">
                      Status updated:{" "}
                      <span className="font-medium text-slate-700">{item.status}</span>
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
