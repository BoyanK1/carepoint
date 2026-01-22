"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function MfaPage() {
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "verifying" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const startChallenge = async () => {
    setStatus("sent");
    setError(null);

    const response = await fetch("/api/mfa/start", { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setStatus("error");
      setError(payload?.error || "Unable to send code.");
    }
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
      setError(payload?.error || "Invalid code.");
      return;
    }

    setStatus("done");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          MFA check
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Verify your access
        </h1>
        <p className="text-slate-600">
          A one-time code will be sent to {session?.user?.email ?? "your email"}.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={startChallenge}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Send code
        </button>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Enter code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="123456"
            />
          </label>
          <button
            onClick={verifyCode}
            disabled={!code || status === "verifying"}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "verifying" ? "Verifying..." : "Verify"}
          </button>
        </div>

        {status === "done" && (
          <p className="mt-4 text-sm font-medium text-emerald-600">
            MFA verified. You can return to the admin panel.
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>
        )}
      </div>
    </div>
  );
}
