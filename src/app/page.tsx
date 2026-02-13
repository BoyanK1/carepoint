"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export default function Home() {
  const { data: session } = useSession();
  const { t } = useLanguage();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <h1 className="text-4xl font-semibold text-slate-900">{t("homeTitle")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">{t("homeSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {t("homeCtaDashboard")}
                </Link>
                <Link
                  href="/doctors"
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {t("homeCtaBrowse")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {t("homeCtaCreate")}
                </Link>
                <Link
                  href="/doctors"
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {t("homeCtaExplore")}
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("homeQuickLabel")}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{t("homeQuickTitle")}</p>
          <p className="mt-2 text-sm text-slate-600">{t("homeQuickBody")}</p>
          <Link
            href="/doctors"
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-900"
          >
            {t("homeQuickButton")}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: t("homeCardVerifiedTitle"),
            body: t("homeCardVerifiedBody"),
          },
          {
            title: t("homeCardProfilesTitle"),
            body: t("homeCardProfilesBody"),
          },
          {
            title: t("homeCardAdminTitle"),
            body: t("homeCardAdminBody"),
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
