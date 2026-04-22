"use client";

import { useLanguage } from "@/components/LanguageProvider";

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t("footerLanguage")}
      </span>
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`rounded-full px-3 py-1.5 transition ${
            lang === "en"
              ? "bg-slate-900 text-white"
              : "hover:bg-slate-100"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("bg")}
          className={`rounded-full px-3 py-1.5 transition ${
            lang === "bg"
              ? "bg-slate-900 text-white"
              : "hover:bg-slate-100"
          }`}
        >
          BG
        </button>
      </div>
    </div>
  );
}
