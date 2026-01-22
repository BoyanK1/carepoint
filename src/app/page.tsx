import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <h1 className="text-4xl font-semibold text-slate-900">
            Book the right doctor with confidence.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            CarePoint helps patients find doctors by specialty, city, or name,
            and keeps appointments organized in one simple dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Go to dashboard
                </Link>
                <Link
                  href="/doctors"
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Browse doctors
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create an account
                </Link>
                <Link
                  href="/doctors"
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Explore doctors
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick search
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            Find by specialty or city
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Use filters to match with cardiologists, dermatologists, and more,
            close to you.
          </p>
          <Link
            href="/doctors"
            className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-900"
          >
            Open doctor search
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Verified doctors",
            body: "Doctors apply with license proof before appearing in search.",
          },
          {
            title: "Patient profiles",
            body: "Upload an avatar and keep personal details secure.",
          },
          {
            title: "Admin oversight",
            body: "Review applications and manage access from the admin panel.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
