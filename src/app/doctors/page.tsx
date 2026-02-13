"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface DoctorReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
}

interface Doctor {
  id: string;
  userId: string;
  name: string;
  specialty: string | null;
  city: string | null;
  avatarUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  latestReviews: DoctorReview[];
}

interface ReviewFormState {
  rating: number;
  comment: string;
  submitting: boolean;
  error: string | null;
  success: string | null;
}

const defaultReviewForm: ReviewFormState = {
  rating: 5,
  comment: "",
  submitting: false,
  error: null,
  success: null,
};

function renderStars(value: number) {
  return "★".repeat(value) + "☆".repeat(5 - value);
}

export default function DoctorsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewForms, setReviewForms] = useState<Record<string, ReviewFormState>>({});

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
      setLoadError(
        error instanceof Error ? error.message : t("doctorsLoadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const filtered = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesQuery =
        doctor.name.toLowerCase().includes(query.toLowerCase()) ||
        (doctor.specialty ?? "").toLowerCase().includes(query.toLowerCase());
      const matchesSpecialty = specialty
        ? (doctor.specialty ?? "")
            .toLowerCase()
            .includes(specialty.toLowerCase())
        : true;
      const matchesCity = city
        ? (doctor.city ?? "").toLowerCase().includes(city.toLowerCase())
        : true;
      return matchesQuery && matchesSpecialty && matchesCity;
    });
  }, [city, doctors, query, specialty]);

  function getReviewForm(doctorId: string) {
    return reviewForms[doctorId] ?? defaultReviewForm;
  }

  function updateReviewForm(
    doctorId: string,
    updater: (previous: ReviewFormState) => ReviewFormState
  ) {
    setReviewForms((current) => {
      const previous = current[doctorId] ?? defaultReviewForm;
      return {
        ...current,
        [doctorId]: updater(previous),
      };
    });
  }

  async function submitReview(doctorId: string) {
    const form = getReviewForm(doctorId);
    updateReviewForm(doctorId, (previous) => ({
      ...previous,
      submitting: true,
      error: null,
      success: null,
    }));

    try {
      const response = await fetch(`/api/doctors/${doctorId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: form.rating,
          comment: form.comment,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || t("doctorsReviewError"));
      }

      updateReviewForm(doctorId, (previous) => ({
        ...previous,
        submitting: false,
        comment: "",
        success: t("doctorsReviewSuccess"),
      }));
      await loadDoctors();
    } catch (error) {
      updateReviewForm(doctorId, (previous) => ({
        ...previous,
        submitting: false,
        error:
          error instanceof Error ? error.message : t("doctorsReviewError"),
      }));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("doctorsBadge")}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {t("doctorsTitle")}
        </h1>
        <p className="text-slate-600">{t("doctorsSubtitle")}</p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
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
          filtered.map((doctor) => {
            const form = getReviewForm(doctor.id);

            return (
              <article
                key={doctor.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar name={doctor.name} src={doctor.avatarUrl} size={42} />
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {doctor.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {doctor.specialty || t("doctorsUnknownSpecialty")} ·{" "}
                        {doctor.city || t("doctorsUnknownCity")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {doctor.ratingCount > 0 && doctor.ratingAverage
                          ? `${t("doctorsRatingLabel")} ${doctor.ratingAverage}/5 (${doctor.ratingCount})`
                          : t("doctorsNoReviews")}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!session) {
                        router.push("/auth");
                        return;
                      }
                    }}
                    className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {session ? t("doctorsRequest") : t("doctorsSignInToRequest")}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {t("doctorsRecentReviews")}
                    </p>
                    <div className="mt-3 space-y-3">
                      {doctor.latestReviews.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {t("doctorsNoReviews")}
                        </p>
                      ) : (
                        doctor.latestReviews.map((review) => (
                          <div
                            key={review.id}
                            className="rounded-lg border border-slate-200 bg-white p-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {renderStars(review.rating)}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {review.comment}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {review.reviewerName} ·{" "}
                              {new Date(review.createdAt).toLocaleDateString(
                                lang === "bg" ? "bg-BG" : "en-US"
                              )}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {t("doctorsLeaveReview")}
                    </p>
                    {session ? (
                      <form
                        className="mt-3 space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitReview(doctor.id);
                        }}
                      >
                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("doctorsYourRating")}
                          <select
                            value={form.rating}
                            onChange={(event) =>
                              updateReviewForm(doctor.id, (previous) => ({
                                ...previous,
                                rating: Number(event.target.value),
                                error: null,
                                success: null,
                              }))
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                          >
                            <option value={5}>5 ★★★★★</option>
                            <option value={4}>4 ★★★★☆</option>
                            <option value={3}>3 ★★★☆☆</option>
                            <option value={2}>2 ★★☆☆☆</option>
                            <option value={1}>1 ★☆☆☆☆</option>
                          </select>
                        </label>

                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t("doctorsYourComment")}
                          <textarea
                            value={form.comment}
                            onChange={(event) =>
                              updateReviewForm(doctor.id, (previous) => ({
                                ...previous,
                                comment: event.target.value,
                                error: null,
                                success: null,
                              }))
                            }
                            className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                            placeholder={t("doctorsCommentPlaceholder")}
                          />
                        </label>

                        {form.error && (
                          <p className="text-xs font-medium text-rose-600">
                            {form.error}
                          </p>
                        )}
                        {form.success && (
                          <p className="text-xs font-medium text-emerald-600">
                            {form.success}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={form.submitting}
                          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {form.submitting
                            ? t("doctorsSubmittingReview")
                            : t("doctorsSubmitReview")}
                        </button>
                      </form>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                        {t("doctorsSignInToReview")}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
