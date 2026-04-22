"use client";

import { signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export function SignOutButton() {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:w-auto"
    >
      {t("profileSignOut")}
    </button>
  );
}
