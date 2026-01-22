"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Please choose a file.");
      return;
    }

    setStatus("uploading");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Upload failed.");
      }

      setStatus("success");
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
          Profile
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Manage your account
        </h1>
        <p className="text-slate-600">
          Update your avatar so patients and doctors recognize you instantly.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Avatar</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload a square photo for the best result.
        </p>
        <form onSubmit={uploadAvatar} className="mt-4 grid gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
          <button
            type="submit"
            disabled={status === "uploading"}
            className="w-fit rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "uploading" ? "Uploading..." : "Upload avatar"}
          </button>
          {status === "success" && (
            <p className="text-sm font-medium text-emerald-600">
              Avatar updated. Refresh to see it in the navigation.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        MFA is required for admin actions. You are signed in as
        <span className="font-semibold text-slate-900">
          {" "}
          {session?.user?.email ?? "your account"}
        </span>
        .
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Session</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sign out when you finish using CarePoint on this device.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
