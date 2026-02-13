"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/components/LanguageProvider";

export function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  const copyright = t("footerCopyright").replace("{year}", String(year));

  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-white via-white to-slate-100/70">
      <div className="mx-auto w-full max-w-6xl px-6 pb-8 pt-14">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-sm shadow-slate-200/60 backdrop-blur md:p-9">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <p className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("footerPill")}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-xs font-semibold text-white shadow-sm">
                    CP
                  </span>
                  <p className="text-xl font-semibold tracking-tight text-slate-900">
                    CarePoint
                  </p>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                  {t("footerTagline")}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <LanguageToggle />
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/doctors"
                    className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {t("footerBrowseDoctors")}
                  </Link>
                  <Link
                    href="/feedback"
                    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {t("footerSendFeedback")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            <div className="grid gap-8 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2.5">
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
              </div>

              <div className="space-y-2.5">
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

              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("footerSupport")}
                </p>
                <Link
                  href="/feedback"
                  className="block transition hover:text-slate-900"
                >
                  {t("footerFeedback")}
                </Link>
                <Link href="/auth" className="block transition hover:text-slate-900">
                  {t("footerSignIn")}
                </Link>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("footerContact")}
                </p>
                <p>{t("footerContactEmail")}</p>
                <p>{t("footerLocation")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>
          <p>{t("footerBottomLine")}</p>
        </div>
      </div>
    </footer>
  );
}
