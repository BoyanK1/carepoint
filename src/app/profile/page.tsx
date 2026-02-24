"use client";

import { useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { useLanguage } from "@/components/LanguageProvider";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default function ProfilePage() {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const uploadAvatar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError(t("profileChooseFile"));
      return;
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
      setStatus("error");
      setError(t("profileAvatarTypeError"));
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setStatus("error");
      setError(t("profileAvatarSizeError"));
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
        const contentType = response.headers.get("content-type") ?? "";
        const payload = contentType.includes("application/json")
          ? await response.json().catch(() => null)
          : null;
        const textFallback = payload ? null : await response.text().catch(() => null);
        throw new Error(payload?.error || textFallback || t("profileUploadFailed"));
      }

      setStatus("success");
      setFile(null);
    } catch (err) {
      setStatus("error");
      if (err instanceof Error && /failed to fetch/i.test(err.message)) {
        setError(t("profileUploadNetworkError"));
        return;
      }
      setError(err instanceof Error ? err.message : t("authUnexpectedError"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 bg-slate-50 px-6 py-12 text-slate-900">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("profileBadge")}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {t("profileTitle")}
        </h1>
        <p className="text-slate-600">{t("profileSubtitle")}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t("profileAvatarTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("profileAvatarSubtitle")}</p>
        <form onSubmit={uploadAvatar} className="mt-4 grid gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              if (!nextFile) {
                setFile(null);
                return;
              }

              if (!ALLOWED_AVATAR_MIME_TYPES.has(nextFile.type)) {
                setStatus("error");
                setFile(null);
                setError(t("profileAvatarTypeError"));
                return;
              }

              if (nextFile.size > MAX_AVATAR_BYTES) {
                setStatus("error");
                setFile(null);
                setError(t("profileAvatarSizeError"));
                return;
              }

              setStatus("idle");
              setError(null);
              setFile(nextFile);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
          />
          <button
            type="submit"
            disabled={status === "uploading"}
            className="w-fit rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "uploading" ? t("profileUploading") : t("profileUploadButton")}
          </button>
          {status === "success" && (
            <p className="text-sm font-medium text-emerald-600">
              {t("profileUploadSuccess")}
            </p>
          )}
          {status === "error" && (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          )}
        </form>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t("profileSessionTitle")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("profileSessionBody")}</p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
