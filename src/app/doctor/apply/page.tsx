"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function DoctorApplyPage() {
  const { t } = useLanguage();
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError(t("applyMissingLicense"));
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("specialty", specialty);
      formData.append("city", city);
      formData.append("license", file);

      const response = await fetch("/api/doctor/apply", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || t("applyError"));
      }

      setStatus("success");
      setSpecialty("");
      setCity("");
      setFile(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("authUnexpectedError"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("applyBadge")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("applyTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t("applySubtitle")}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("applySpecialtyLabel")}
            <input
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("applySpecialtyPlaceholder")}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("applyCityLabel")}
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("applyCityPlaceholder")}
              required
            />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
          {t("applyLicenseLabel")}
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            required
          />
        </label>

        <div className="mt-6 grid gap-3 sm:flex sm:items-center">
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? t("applySubmitting") : t("applySubmit")}
          </button>
          {status === "success" && (
            <span className="text-sm font-medium text-emerald-600">
              {t("applySuccess")}
            </span>
          )}
          {status === "error" && (
            <span className="text-sm font-medium text-rose-600">{error}</span>
          )}
        </div>
      </form>
    </div>
  );
}
