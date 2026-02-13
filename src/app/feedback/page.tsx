"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export default function FeedbackPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || t("feedbackError"));
      }

      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t("authUnexpectedError"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{t("feedbackTitle")}</h1>
        <p className="text-slate-600">{t("feedbackSubtitle")}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("feedbackName")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("feedbackNamePlaceholder")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("feedbackEmail")}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("feedbackEmailPlaceholder")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("feedbackMessage")}
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-[140px] rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("feedbackMessagePlaceholder")}
              required
            />
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? t("feedbackSending") : t("feedbackSend")}
          </button>
          {status === "success" && (
            <span className="text-sm font-medium text-emerald-600">
              {t("feedbackSuccess")}
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
