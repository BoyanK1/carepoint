"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface NavbarUser {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

interface NavbarClientProps {
  user: NavbarUser | null;
}

export function NavbarClient({ user }: NavbarClientProps) {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition ${
        scrolled
          ? "border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm"
          : "border-b border-slate-200/60 bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex items-center py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-xs font-semibold text-white shadow-sm">
              CP
            </span>
            <span className="text-lg font-semibold leading-none tracking-tight text-slate-900">
              CarePoint
            </span>
          </Link>

          <div className="flex-1" />

          <div className="ml-auto flex items-center gap-3">
            <nav className="hidden items-center justify-end md:flex">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-sm font-medium text-slate-700 shadow-sm">
                <Link
                  href="/doctors"
                  className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {t("navDoctors")}
                </Link>
                <Link
                  href="/doctor/apply"
                  className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {t("navBecomeDoctor")}
                </Link>
                {user && (
                  <Link
                    href="/dashboard"
                    className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {t("navDashboard")}
                  </Link>
                )}
                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    {t("navAdmin")}
                  </Link>
                )}
              </div>
            </nav>
            {user ? (
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 transition hover:border-slate-300"
              >
                <Avatar name={user.name} src={user.avatarUrl} size={28} />
                <span className="max-w-24 truncate text-sm font-medium text-slate-700 sm:max-w-none">
                  {user.name || user.email || t("navAccount")}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                {t("navSignIn")}
              </Link>
            )}
          </div>
        </div>

        <div className="pb-3 md:hidden">
          <nav className="overflow-x-auto">
            <div className="inline-flex min-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-1 text-sm font-medium text-slate-700 shadow-sm">
              <Link
                href="/doctors"
                className="rounded-full px-3 py-1.5 whitespace-nowrap transition hover:bg-slate-100 hover:text-slate-900"
              >
                {t("navDoctors")}
              </Link>
              <Link
                href="/doctor/apply"
                className="rounded-full px-3 py-1.5 whitespace-nowrap transition hover:bg-slate-100 hover:text-slate-900"
              >
                {t("navBecomeDoctor")}
              </Link>
              {user && (
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-1.5 whitespace-nowrap transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {t("navDashboard")}
                </Link>
              )}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 whitespace-nowrap transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {t("navAdmin")}
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
