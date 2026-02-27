"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface DashboardClientProps {
  displayName: string;
  email: string | null | undefined;
  avatarName: string | null | undefined;
  avatarUrl: string | null | undefined;
  role: string | null | undefined;
  city: string | null | undefined;
}

export function DashboardClient({
  displayName,
  email,
  avatarName,
  avatarUrl,
  role,
  city,
}: DashboardClientProps) {
  const { t } = useLanguage();

  const roleLabel =
    role === "admin"
      ? t("dashboardRoleAdmin")
      : role === "doctor"
        ? t("dashboardRoleDoctor")
        : role === "doctor_pending"
          ? t("dashboardRolePending")
          : t("dashboardRolePatient");

  const welcome = t("dashboardWelcome").replace("{name}", displayName);
  const [cityValue, setCityValue] = useState(city ?? "");
  const [savedCity, setSavedCity] = useState(city ?? "");
  const [cityStatus, setCityStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [cityError, setCityError] = useState<string | null>(null);

  const canApplyDoctor = role !== "doctor";

  async function saveCity() {
    setCityStatus("saving");
    setCityError(null);

    const response = await fetch("/api/profile/city", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: cityValue }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; city?: string; error?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      setCityStatus("error");
      setCityError(payload?.error || t("dashboardCitySaveError"));
      return;
    }

    setSavedCity(payload.city ?? cityValue);
    setCityStatus("ok");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{t("dashboardTitle")}</h1>
        <p className="text-slate-600">{welcome}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar name={avatarName} src={avatarUrl} size={56} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{displayName}</h2>
              <p className="text-sm text-slate-600">{email}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-700">
            <p>
              <span className="font-semibold">{t("dashboardRoleLabel")}</span> {roleLabel}
            </p>
            <p>
              <span className="font-semibold">{t("dashboardCityLabel")}</span>{" "}
              {savedCity || t("dashboardNotSet")}
            </p>
            <div className="mt-2 grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("dashboardCityInputLabel")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={cityValue}
                  onChange={(event) => setCityValue(event.target.value)}
                  placeholder={t("dashboardCityInputPlaceholder")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void saveCity()}
                  disabled={cityStatus === "saving"}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cityStatus === "saving"
                    ? t("dashboardCitySaving")
                    : t("dashboardCitySave")}
                </button>
              </div>
              {cityStatus === "ok" && (
                <p className="text-xs font-medium text-emerald-600">
                  {t("dashboardCitySaved")}
                </p>
              )}
              {cityStatus === "error" && (
                <p className="text-xs font-medium text-rose-600">
                  {cityError || t("dashboardCitySaveError")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{t("dashboardQuickTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("dashboardQuickBody")}</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/profile"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t("dashboardUpdateProfile")}
            </Link>
            {canApplyDoctor && (
              <Link
                href="/doctor/apply"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                {t("dashboardApplyDoctor")}
              </Link>
            )}
            <Link
              href="/appointments"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              My appointments
            </Link>
            <Link
              href="/history"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Appointment history
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
