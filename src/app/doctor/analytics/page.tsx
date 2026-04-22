"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

interface AnalyticsPayload {
  doctor: {
    id: string;
    userId: string;
    specialty: string | null;
    city: string | null;
  };
  metrics: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    ratingCount: number;
    averageRating: number | null;
    cancellationRate: number;
    weeklyBookings: Array<{ weekStart: string; count: number }>;
  };
}

export default function DoctorAnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";

  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/doctor/analytics", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as
        | (AnalyticsPayload & { error?: string })
        | null;

      if (!response.ok || !data?.doctor || !data.metrics) {
        setError(data?.error || t("doctorAnalyticsLoadError"));
        setLoading(false);
        return;
      }

      setPayload({
        doctor: data.doctor,
        metrics: data.metrics,
      });
    } catch {
      setError(t("doctorAnalyticsLoadError"));
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
      void loadAnalytics();
    }
  }, [status, router, loadAnalytics]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t("doctorAnalyticsBadge")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("doctorAnalyticsTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          {t("doctorAnalyticsSubtitle")}
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("doctorAnalyticsLoading")}
        </div>
      ) : payload ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("doctorAnalyticsTotal")}
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{payload.metrics.total}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("doctorAnalyticsUpcoming")}
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {payload.metrics.upcoming}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("doctorAnalyticsCompleted")}
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {payload.metrics.completed}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {t("doctorAnalyticsCancelled")}
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">
                {payload.metrics.cancelled}
              </p>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                {t("doctorAnalyticsQualityTitle")}
              </h2>
              <dl className="mt-4 grid gap-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("doctorAnalyticsAverageRating")}</dt>
                  <dd className="font-semibold text-slate-900">
                    {payload.metrics.averageRating ?? t("doctorAnalyticsNoRating")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("doctorAnalyticsRatingCount")}</dt>
                  <dd className="font-semibold text-slate-900">{payload.metrics.ratingCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("doctorAnalyticsCancellationRate")}</dt>
                  <dd className="font-semibold text-slate-900">
                    {payload.metrics.cancellationRate}%
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                {t("doctorAnalyticsWeeklyTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{t("doctorAnalyticsWeeklySubtitle")}</p>
              {payload.metrics.weeklyBookings.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">{t("doctorAnalyticsWeeklyEmpty")}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {payload.metrics.weeklyBookings.map((item) => (
                    <div
                      key={item.weekStart}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-sm text-slate-700">
                        {new Date(item.weekStart).toLocaleDateString(locale)}
                      </p>
                      <p className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {t("doctorAnalyticsBookings").replace("{count}", String(item.count))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
