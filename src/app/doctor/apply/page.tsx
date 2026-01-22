"use client";

import { useState } from "react";

export default function DoctorApplyPage() {
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
      setError("Please upload a license document.");
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
        throw new Error(payload?.error || "Application failed.");
      }

      setStatus("success");
      setSpecialty("");
      setCity("");
      setFile(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Doctor verification
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Apply to join CarePoint
        </h1>
        <p className="text-slate-600">
          Upload your medical license so our team can verify your credentials.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Specialty
            <input
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Cardiology"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            City / Region
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Sofia"
              required
            />
          </label>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
          Medical license (PDF or image)
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            required
          />
        </label>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? "Submitting..." : "Submit application"}
          </button>
          {status === "success" && (
            <span className="text-sm font-medium text-emerald-600">
              Application received. We will review your license.
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
