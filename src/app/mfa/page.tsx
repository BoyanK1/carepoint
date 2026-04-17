"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { getSafeInternalRedirect } from "@/lib/security/redirect";

export default function MfaPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "verifying" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [sendAnimating, setSendAnimating] = useState(false);

  const startChallenge = async () => {
    setSendAnimating(true);
    setStatus("sending");
    setError(null);

    const response = await fetch("/api/mfa/start", { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus("error");
      setError(payload?.error || t("mfaSendError"));
      setTimeout(() => setSendAnimating(false), 250);
      return;
    }

    setStatus("sent");
    setTimeout(() => setSendAnimating(false), 250);
  };

  const verifyCode = async () => {
    setStatus("verifying");
    setError(null);

    const response = await fetch("/api/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus("error");
      setError(payload?.error || t("mfaInvalidCode"));
      return;
    }

    setStatus("done");
    router.push(getSafeInternalRedirect(searchParams.get("next"), "/admin"));
    router.refresh();
  };

  const subtitle = t("mfaSubtitle").replace(
    "{email}",
    session?.user?.email ?? t("commonYourEmail")
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("mfaBadge")}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("mfaTitle")}</h1>
        <p className="text-slate-600">{subtitle}</p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={startChallenge}
          disabled={status === "sending"}
          className={`rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 ${
            sendAnimating ? "animate-pulse scale-95" : ""
          }`}
        >
          {status === "sending" ? t("mfaSending") : t("mfaSendCode")}
        </button>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("mfaEnterCode")}
            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("mfaCodePlaceholder")}
            />
          </label>
          <button
            onClick={verifyCode}
            disabled={code.length !== 6 || status === "verifying"}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "verifying" ? t("mfaVerifying") : t("mfaVerify")}
          </button>
        </div>

        {status === "done" && (
          <p className="mt-4 text-sm font-medium text-emerald-600">{t("mfaSuccess")}</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>
        )}
      </div>
    </div>
  );
}
