"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialty: string | null;
  city: string | null;
  avatarUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  soonestAvailableAt: string | null;
  isFavorite: boolean;
}

type SortMode = "relevance" | "rating" | "nearest" | "soonest";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function cityScore(doctorCity: string | null, targetCity: string) {
  if (!targetCity) {
    return 2;
  }
  const city = normalize(doctorCity);
  const target = normalize(targetCity);
  if (!city || !target) {
    return 3;
  }
  if (city === target) {
    return 0;
  }
  if (city.startsWith(target) || city.includes(target)) {
    return 1;
  }
  return 2;
}

export default function DoctorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/doctors", { cache: "no-store" });
      const payload = (await response.json()) as {
        doctors?: Doctor[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("doctorsLoadError"));
      }

      setDoctors(payload.doctors ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t("doctorsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const filtered = useMemo(() => {
    const search = normalize(query);
    const specialtyFilter = normalize(specialty);
    const cityFilter = normalize(city);

    const result = doctors.filter((doctor) => {
      const matchesSearch =
        normalize(doctor.name).includes(search) ||
        normalize(doctor.specialty).includes(search);
      const matchesSpecialty = specialtyFilter
        ? normalize(doctor.specialty).includes(specialtyFilter)
        : true;
      const matchesCity = cityFilter ? normalize(doctor.city).includes(cityFilter) : true;
      return matchesSearch && matchesSpecialty && matchesCity;
    });

    return result.sort((a, b) => {
      if (sort === "rating") {
        return (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0);
      }
      if (sort === "nearest") {
        return cityScore(a.city, city) - cityScore(b.city, city);
      }
      if (sort === "soonest") {
        if (!a.soonestAvailableAt) {
          return 1;
        }
        if (!b.soonestAvailableAt) {
          return -1;
        }
        return (
          new Date(a.soonestAvailableAt).getTime() -
          new Date(b.soonestAvailableAt).getTime()
        );
      }
      return a.name.localeCompare(b.name);
    });
  }, [city, doctors, query, sort, specialty]);

  async function toggleFavorite(doctor: Doctor) {
    if (!session) {
      router.push("/auth");
      return;
    }

    const method = doctor.isFavorite ? "DELETE" : "POST";
    const response = await fetch(`/api/doctors/${doctor.id}/favorite`, {
      method,
    });

    if (!response.ok) {
      return;
    }

    setDoctors((current) =>
      current.map((item) =>
        item.id === doctor.id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("doctorsBadge")}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("doctorsTitle")}</h1>
        <p className="text-slate-600">{t("doctorsSubtitle")}</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {t("doctorsSearchLabel")}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            placeholder={t("doctorsSearchPlaceholder")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {t("doctorsSpecialtyLabel")}
          <input
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            placeholder={t("doctorsSpecialtyPlaceholder")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          {t("doctorsCityLabel")}
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
            placeholder={t("doctorsCityPlaceholder")}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Sort by
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
          >
            <option value="relevance">Name</option>
            <option value="rating">Rating</option>
            <option value="nearest">Nearest city</option>
            <option value="soonest">Soonest availability</option>
          </select>
        </label>
      </section>

      <section className="grid gap-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            {t("doctorsLoading")}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {loadError}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
            {t("doctorsEmpty")}
          </div>
        ) : (
          filtered.map((doctor) => (
            <article
              key={doctor.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <Avatar name={doctor.name} src={doctor.avatarUrl} size={44} />
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{doctor.name}</p>
                    <p className="text-sm text-slate-600">
                      {doctor.specialty || t("doctorsUnknownSpecialty")} ·{" "}
                      {doctor.city || t("doctorsUnknownCity")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {doctor.ratingCount > 0 && doctor.ratingAverage
                        ? `${doctor.ratingAverage}/5 (${doctor.ratingCount} reviews)`
                        : t("doctorsNoReviews")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {doctor.soonestAvailableAt
                        ? `Soonest slot: ${new Date(doctor.soonestAvailableAt).toLocaleString()}`
                        : "No open slots in the next 30 days"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(doctor)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      doctor.isFavorite
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {doctor.isFavorite ? "Favorited" : "Add to favorites"}
                  </button>
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    View profile
                  </Link>
                  {session?.user?.id && session.user.id === doctor.userId ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
                      You cannot book yourself
                    </span>
                  ) : (
                    <Link
                      href={`/doctors/${doctor.id}`}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      {session ? "Book now" : t("doctorsSignInToRequest")}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
