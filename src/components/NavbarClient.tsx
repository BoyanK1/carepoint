"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";

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
          ? "border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-xs font-semibold text-white">
            CP
          </span>
          <span className="text-lg font-semibold text-slate-900">CarePoint</span>
        </Link>

        <nav className="flex items-center justify-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/doctors" className="transition hover:text-slate-900">
            Doctors
          </Link>
          <Link href="/doctor/apply" className="transition hover:text-slate-900">
            Become a doctor
          </Link>
          {user && (
            <Link href="/dashboard" className="transition hover:text-slate-900">
              Dashboard
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className="transition hover:text-slate-900">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center justify-end">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-full border border-slate-200 px-3 py-1 transition hover:border-slate-300"
            >
              <Avatar name={user.name} src={user.avatarUrl} size={28} />
              <span className="text-sm font-medium text-slate-700">
                {user.name || user.email || "Account"}
              </span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
