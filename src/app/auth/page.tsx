"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export default function AuthPage() {
  const { t } = useLanguage();
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [signUpCity, setSignUpCity] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCredentialsSignIn = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = await signIn("credentials", {
      email: signInEmail,
      password: signInPassword,
      redirect: true,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError(t("authInvalidCredentials"));
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signUpName,
          city: signUpCity,
          email: signUpEmail,
          password: signUpPassword,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || t("authSignUpFailed"));
      }

      setMessage(t("authSuccessMessage"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("authUnexpectedError"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("authBadge")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("authTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t("authSubtitle")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("authReturningTitle")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("authReturningBody")}</p>
          <form onSubmit={handleCredentialsSignIn} className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("authEmail")}
              <input
                type="email"
                value={signInEmail}
                onChange={(event) => setSignInEmail(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("authPassword")}
              <input
                type="password"
                value={signInPassword}
                onChange={(event) => setSignInPassword(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                required
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t("authSignIn")}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{t("authCreateTitle")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("authCreateBody")}</p>
          <form onSubmit={handleSignUp} className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("authName")}
              <input
                value={signUpName}
                onChange={(event) => setSignUpName(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                placeholder={t("commonOptional")}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("authCity")}
              <input
                value={signUpCity}
                onChange={(event) => setSignUpCity(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                placeholder={t("authCityPlaceholder")}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("authEmail")}
              <input
                type="email"
                value={signUpEmail}
                onChange={(event) => setSignUpEmail(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {t("authPassword")}
              <input
                type="password"
                value={signUpPassword}
                onChange={(event) => setSignUpPassword(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
                required
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t("authCreateButton")}
            </button>
          </form>
        </section>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600 sm:p-6">
        {t("authMfaNote")}
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
