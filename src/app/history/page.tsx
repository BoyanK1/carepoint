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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Patient tools
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Appointment history</h1>
        <p className="text-slate-600">
          Timeline view with filters. Export your records as CSV.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4 md:items-end">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          From
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-slate-700">
          To
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
          />
        </label>

        <button
          type="button"
          onClick={() => void loadHistory()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Apply filters
        </button>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">{items.length} records</p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/appointments/history/export";
          }}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading timeline...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No records match your filters.
        </div>
      ) : (
        <section className="space-y-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.status}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(item.startsAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.doctor?.name || "Doctor"} · {item.doctor?.specialty || "N/A"}
                  </p>
                </div>
                <p className="text-xs text-slate-500">Record ID: {item.id}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.reason || "No note"}</p>
              <p className="mt-1 text-xs text-slate-500">
                Logged on {new Date(item.createdAt).toLocaleDateString()}
              </p>
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
