"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
  initialUnreadCount?: number;
}

export function NavbarClient({ user, initialUnreadCount = 0 }: NavbarClientProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();
  const effectiveUnreadCount = user ? initialUnreadCount : 0;
  const canApplyDoctor = !user || user.role === "patient";

  const roleLabel =
    user?.role === "doctor"
      ? t("navRoleDoctor")
      : user?.role === "admin"
        ? t("navRoleAdmin")
        : t("navRolePatient");

  const notificationsLabel =
    effectiveUnreadCount > 0
      ? `${t("navNotifications")} ${effectiveUnreadCount >= 10 ? "10+" : effectiveUnreadCount}`
      : t("navNotifications");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/doctors", label: t("navDoctors"), show: true },
    { href: "/doctor/apply", label: t("navBecomeDoctor"), show: canApplyDoctor },
    { href: "/dashboard", label: t("navDashboard"), show: Boolean(user) },
    { href: "/appointments", label: t("navAppointments"), show: Boolean(user) },
    {
      href: "/doctor/schedule",
      label: t("navSchedule"),
      show: user?.role === "doctor",
    },
    {
      href: "/doctor/analytics",
      label: t("navAnalytics"),
      show: user?.role === "doctor",
    },
    { href: "/notifications", label: notificationsLabel, show: Boolean(user) },
    { href: "/admin", label: t("navAdmin"), show: user?.role === "admin" },
  ].filter((item) => item.show);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && Boolean(pathname?.startsWith(`${href}/`)));

  return (
    <header
      className={`sticky top-0 z-50 transition ${
        scrolled
          ? "border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm"
          : "border-b border-slate-200/60 bg-white/80 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center gap-3 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-xs font-semibold text-white shadow-sm">
              CP
            </span>
            <span className="truncate text-base font-semibold leading-none tracking-tight text-slate-900 sm:text-lg">
              CarePoint
            </span>
          </Link>

          <div className="flex-1" />

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <nav className="hidden min-w-0 items-center justify-end lg:flex">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-sm font-medium text-slate-700 shadow-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-3 py-1 transition ${
                      isActive(item.href)
                        ? "bg-slate-100 text-slate-900 shadow-sm"
                        : "hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
            {user ? (
              <>
                <Link
                  href="/profile"
                  className={`flex max-w-[3rem] shrink-0 items-center gap-2 overflow-hidden rounded-full border bg-white/95 py-1.5 pl-1.5 pr-1.5 shadow-sm transition sm:max-w-[14rem] sm:pr-2.5 ${
                    isActive("/profile")
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200/90 hover:border-slate-300"
                  }`}
                  title={user.name || user.email || t("navAccount")}
                >
                  <Avatar name={user.name} src={user.avatarUrl} size={32} />
                  <span className="hidden max-w-[9rem] truncate text-sm font-medium text-slate-700 sm:inline">
                    {user.name || user.email || t("navAccount")}
                  </span>
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:inline-flex">
                    {roleLabel}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="hidden rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800 sm:inline-flex"
                >
                  {t("profileSignOut")}
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className={`rounded-full border bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition ${
                  isActive("/auth")
                    ? "border-slate-300 bg-slate-50 text-slate-900"
                    : "border-slate-200 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {t("navSignIn")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Menu"}
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="pb-4 lg:hidden">
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/70">
              <nav className="grid grid-cols-2 gap-2 text-sm font-semibold text-slate-700">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-2xl border px-3 py-3 transition ${
                      isActive(item.href)
                        ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {user && (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="mt-3 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                >
                  {t("profileSignOut")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
