"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";

export function Footer() {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const copyright = t("footerCopyright").replace("{year}", String(year));

  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-white via-white to-slate-100/70">
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-200/60 backdrop-blur sm:p-5 md:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("footerPill")}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-[11px] font-semibold text-white shadow-sm">
                    CP
                  </span>
                  <p className="text-lg font-semibold tracking-tight text-slate-900">
                    CarePoint
                  </p>
                </div>
                <p className="max-w-lg text-sm leading-relaxed text-slate-600">
                  {t("footerTagline")}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <LanguageToggle />
                <div className="grid gap-3 sm:flex sm:flex-wrap">
                  <Link
                    href="/doctors"
                    className="rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t("footerBrowseDoctors")}
                  </Link>
                  <Link
                    href="/feedback"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {t("footerSendFeedback")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <div className="grid gap-6 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("footerExplore")}
                </p>
                <Link href="/" className="block transition hover:text-slate-900">
                  {t("footerHome")}
                </Link>
                <Link
                  href="/doctors"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerDoctorSearch")}
                </Link>
                <Link
                  href="/dashboard"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerDashboard")}
                </Link>
                <Link
                  href="/appointments"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerMyAppointments")}
                </Link>
                <Link href="/history" className="block transition hover:text-slate-900">
                  {t("footerHistoryTimeline")}
                </Link>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("footerForDoctors")}
                </p>
                <Link
                  href="/doctor/apply"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerApplyVerification")}
                </Link>
                <Link href="/faq" className="block transition hover:text-slate-900">
                  {t("footerFaq")}
                </Link>
                <p className="text-xs text-slate-500">{t("footerReviewTime")}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("footerSupport")}
                </p>
                <Link
                  href="/feedback"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerFeedback")}
                </Link>
                {session?.user ? (
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block text-left transition hover:text-slate-900"
                  >
                    {t("profileSignOut")}
                  </button>
                ) : (
                  <Link href="/auth" className="block transition hover:text-slate-900">
                    {t("footerSignIn")}
                  </Link>
                )}
                <Link
                  href="/notifications"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerNotifications")}
                </Link>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("footerContact")}
                </p>
                <p>{t("footerContactEmail")}</p>
                <p>{t("footerLocation")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>
          <p>{t("footerBottomLine")}</p>
        </div>
      </div>
    </footer>
  );
}
