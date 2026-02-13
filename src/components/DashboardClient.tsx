"use client";

import Link from "next/link";
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
              {city ?? t("dashboardNotSet")}
            </p>
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
            <Link
              href="/doctor/apply"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              {t("dashboardApplyDoctor")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
