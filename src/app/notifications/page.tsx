"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/notifications", { cache: "no-store" });
    const payload = (await response.json()) as {
      notifications?: NotificationItem[];
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Could not load notifications.");
      setLoading(false);
      return;
    }

    setNotifications(payload.notifications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadNotifications();
    }
  }, [status, router, loadNotifications]);

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });

    if (!response.ok) {
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      }))
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Inbox
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Notifications center</h1>
          <p className="text-slate-600">
            Booking and application status updates arrive here first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Mark all as read
        </button>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
          No notifications yet.
        </div>
      ) : (
        <section className="space-y-3">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                item.is_read
                  ? "border-slate-200 bg-white"
                  : "border-indigo-200 bg-indigo-50/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.message}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                {item.category}
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
