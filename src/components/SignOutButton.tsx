"use client";

import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export function SignOutButton() {
  const { t } = useLanguage();

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      {t("profileSignOut")}
    </button>
  );
}
