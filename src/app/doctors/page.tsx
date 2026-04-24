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
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<SortMode>("relevance");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTime] = useState(() => Date.now());

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDoctors();
  }, [loadDoctors]);

  const preparedDoctors = useMemo(
    () =>
      doctors.map((doctor) => ({
        ...doctor,
        normalizedName: normalize(doctor.name),
        normalizedSpecialty: normalize(doctor.specialty),
        normalizedCity: normalize(doctor.city),
        soonestTimestamp: doctor.soonestAvailableAt
          ? new Date(doctor.soonestAvailableAt).getTime()
          : null,
      })),
    [doctors]
  );

  const filtered = useMemo(() => {
    const search = normalize(query);
    const specialtyFilter = normalize(specialty);
    const cityFilter = normalize(city);
    const emergencyCutoff = currentTime + 24 * 60 * 60 * 1000;

    const result = preparedDoctors.filter((doctor) => {
      const matchesSearch =
        doctor.normalizedName.includes(search) ||
        doctor.normalizedSpecialty.includes(search);
      const matchesSpecialty = specialtyFilter
        ? doctor.normalizedSpecialty.includes(specialtyFilter)
        : true;
      const matchesCity = cityFilter ? doctor.normalizedCity.includes(cityFilter) : true;
      const hasEmergencySlot =
        doctor.soonestTimestamp !== null && doctor.soonestTimestamp <= emergencyCutoff;
      const matchesEmergency = emergencyOnly ? hasEmergencySlot : true;
      return matchesSearch && matchesSpecialty && matchesCity && matchesEmergency;
    });

    return result.sort((a, b) => {
      if (sort === "rating") {
        return (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0);
      }
      if (sort === "nearest") {
        return cityScore(a.city, city) - cityScore(b.city, city);
      }
      if (sort === "soonest") {
        if (a.soonestTimestamp === null) {
          return 1;
        }
        if (b.soonestTimestamp === null) {
          return -1;
        }
        return a.soonestTimestamp - b.soonestTimestamp;
      }
      return a.name.localeCompare(b.name);
    });
  }, [city, currentTime, emergencyOnly, preparedDoctors, query, sort, specialty]);

  async function toggleFavorite(doctor: Doctor) {
    if (!session) {
      router.push("/auth");
      return;
    }

    try {
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
    } catch {
      return;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("doctorsBadge")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {t("doctorsTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          {t("doctorsSubtitle")}
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:grid-cols-4">
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
          {t("doctorsSortLabel")}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
          >
            <option value="relevance">{t("doctorsSortName")}</option>
            <option value="rating">{t("doctorsSortRating")}</option>
            <option value="nearest">{t("doctorsSortNearest")}</option>
            <option value="soonest">{t("doctorsSortSoonest")}</option>
          </select>
        </label>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {locale === "bg-BG" ? "Нужен ти е бърз час?" : "Need a faster appointment?"}
            </p>
            <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
              {locale === "bg-BG"
                ? "Покажи само лекари с наличност в следващите 24 часа."
                : "Show only doctors with open availability in the next 24 hours."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEmergencyOnly((value) => !value)}
            className={`w-full rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:w-auto sm:text-sm ${
              emergencyOnly
                ? "bg-rose-600 text-white hover:bg-rose-500"
                : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {t("doctorsEmergencyToggle")}
          </button>
        </div>
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
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar name={doctor.name} src={doctor.avatarUrl} size={44} />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-900">{doctor.name}</p>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {doctor.specialty || t("doctorsUnknownSpecialty")} ·{" "}
                      {doctor.city || t("doctorsUnknownCity")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {doctor.ratingCount > 0 && doctor.ratingAverage
                        ? t("doctorsReviewsCount")
                            .replace("{rating}", String(doctor.ratingAverage))
                            .replace("{count}", String(doctor.ratingCount))
                        : t("doctorsNoReviews")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {doctor.soonestAvailableAt
                        ? t("doctorsSoonestSlot").replace(
                            "{date}",
                            new Date(doctor.soonestAvailableAt).toLocaleString(locale)
                          )
                        : t("doctorsNoOpenSlots")}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(doctor)}
                    className={`rounded-full border px-4 py-2.5 text-center text-xs font-semibold transition ${
                      doctor.isFavorite
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {doctor.isFavorite ? t("doctorsFavorited") : t("doctorsAddFavorite")}
                  </button>
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    {t("doctorsViewProfile")}
                  </Link>
                  {session?.user?.id && session.user.id === doctor.userId ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-slate-500">
                      {t("doctorsCannotBookSelf")}
                    </span>
                  ) : (
                    <Link
                      href={`/doctors/${doctor.id}`}
                      className="rounded-full bg-slate-900 px-4 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      {session ? t("doctorsBookNow") : t("doctorsSignInToRequest")}
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
