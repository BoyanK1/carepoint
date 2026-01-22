import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-xs font-semibold text-white">
              CP
            </span>
            <p className="text-base font-semibold text-slate-900">CarePoint</p>
          </div>
          <p className="text-sm text-slate-500">
            Helping patients find trusted doctors and organize appointments with
            confidence.
          </p>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} CarePoint. Diploma project.
          </p>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Explore
          </p>
          <Link href="/doctors" className="block hover:text-slate-900">
            Doctor search
          </Link>
          <Link href="/doctor/apply" className="block hover:text-slate-900">
            Become a doctor
          </Link>
          <Link href="/dashboard" className="block hover:text-slate-900">
            Dashboard
          </Link>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Support
          </p>
          <Link href="/feedback" className="block hover:text-slate-900">
            Send feedback
          </Link>
          <Link href="/faq" className="block hover:text-slate-900">
            FAQ
          </Link>
          <Link href="/auth" className="block hover:text-slate-900">
            Sign in
          </Link>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contact
          </p>
          <p>support@carepoint.local</p>
          <p>Sofia, Bulgaria</p>
        </div>
      </div>
    </footer>
  );
}
