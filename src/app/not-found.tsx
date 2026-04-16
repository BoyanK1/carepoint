import Link from "next/link";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function NotFound() {
  const t = await getServerTranslations();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 sm:py-24">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t.notFoundBadge}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t.notFoundTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          {t.notFoundBody}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t.notFoundHome}
          </Link>
          <Link
            href="/doctors"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            {t.notFoundDoctors}
          </Link>
        </div>
      </section>
    </div>
  );
}
