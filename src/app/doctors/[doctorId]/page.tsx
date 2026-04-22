"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface RatingBreakdownItem {
  stars: number;
  count: number;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewerName: string;
  verifiedVisit?: boolean;
}

interface SlotItem {
  startsAt: string;
  endsAt: string;
}

interface DoctorDetail {
  id: string;
  userId: string;
  name: string;
  specialty: string | null;
  city: string | null;
  avatarUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  ratingBreakdown: RatingBreakdownItem[];
  reviews: ReviewItem[];
  availableSlots: SlotItem[];
  isFavorite: boolean;
}

const MIN_BOOKING_NOTE_LENGTH = 100;

function stars(value: number) {
  return "★".repeat(value) + "☆".repeat(5 - value);
}

export default function DoctorDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";

  const doctorId = params?.doctorId;
  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const isSelfDoctor = Boolean(session?.user?.id && doctor?.userId && session.user.id === doctor.userId);
  const trimmedReasonLength = reason.trim().length;
  const canBookWithNote = trimmedReasonLength >= MIN_BOOKING_NOTE_LENGTH;

  const loadDoctor = useCallback(async () => {
    if (!doctorId) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/doctors/${doctorId}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        doctor?: DoctorDetail;
        error?: string;
      };

      if (!response.ok || !payload.doctor) {
        setError(payload.error || t("doctorDetailLoadError"));
        return;
      }

      setDoctor(payload.doctor);
    } catch {
      setError(t("doctorDetailLoadError"));
    } finally {
      setLoading(false);
    }
  }, [doctorId, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDoctor();
  }, [loadDoctor]);

  const groupedSlots = useMemo(() => {
    if (!doctor) {
      return [] as Array<{ dayLabel: string; slots: SlotItem[] }>;
    }

    const groups = new Map<string, SlotItem[]>();
    for (const slot of doctor.availableSlots) {
      const key = new Date(slot.startsAt).toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const current = groups.get(key) ?? [];
      current.push(slot);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([dayLabel, slots]) => ({
      dayLabel,
      slots,
    }));
  }, [doctor, locale]);

  async function toggleFavorite() {
    if (!doctor) {
      return;
    }
    if (!session) {
      router.push("/auth");
      return;
    }

    try {
      const response = await fetch(`/api/doctors/${doctor.id}/favorite`, {
        method: doctor.isFavorite ? "DELETE" : "POST",
      });

      if (!response.ok) {
        return;
      }

      setDoctor({ ...doctor, isFavorite: !doctor.isFavorite });
    } catch {
      return;
    }
  }

  async function bookSlot(slot: SlotItem) {
    if (!doctor) {
      return;
    }
    if (!session) {
      router.push("/auth");
      return;
    }
    if (session.user.id === doctor.userId) {
      setBookingError(t("doctorDetailBookYourselfError"));
      return;
    }
    if (!canBookWithNote) {
      setBookingError(t("doctorDetailBookingNoteError"));
      return;
    }

    setPendingSlot(slot.startsAt);
    setBookingError(null);
    setBookingMessage(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorProfileId: doctor.id,
          startsAt: slot.startsAt,
          reason,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setBookingError(payload.error || t("doctorDetailBookingError"));
        return;
      }

      setBookingMessage(t("doctorDetailBookedSuccess"));
      setReason("");
      await loadDoctor();
    } catch {
      setBookingError(t("doctorDetailBookingError"));
    } finally {
      setPendingSlot(null);
    }
  }

  async function submitReview() {
    if (!doctor) {
      return;
    }
    if (!session) {
      router.push("/auth");
      return;
    }

    setReviewError(null);
    setReviewMessage(null);

    try {
      const response = await fetch(`/api/doctors/${doctor.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setReviewError(payload.error || t("doctorDetailReviewError"));
        return;
      }

      setReviewMessage(t("doctorDetailReviewSubmitted"));
      setComment("");
      await loadDoctor();
    } catch {
      setReviewError(t("doctorDetailReviewError"));
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          {t("doctorDetailLoading")}
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {error || t("doctorDetailNotFound")}
        </div>
      </div>
    );
  }

  const ratingSummary =
    doctor.ratingCount > 0 && doctor.ratingAverage
      ? t("doctorDetailRatingFromReviews")
          .replace("{rating}", String(doctor.ratingAverage))
          .replace("{count}", String(doctor.ratingCount))
      : t("doctorDetailNoRating");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={doctor.name} src={doctor.avatarUrl} size={56} />
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {doctor.name}
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
                {doctor.specialty || t("doctorDetailGeneralSpecialty")} · {doctor.city || t("commonNotAvailable")}
              </p>
              <p className="mt-1 text-sm text-slate-500">{ratingSummary}</p>
              {searchParams.get("rebook") === "1" && (
                <p className="mt-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {t("doctorDetailQuickRebookingMode")}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:flex">
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                doctor.isFavorite
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {doctor.isFavorite ? t("doctorsFavorited") : t("doctorsAddFavorite")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/appointments")}
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              {t("doctorDetailMyAppointments")}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">{t("doctorDetailScheduleTitle")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("doctorDetailScheduleSubtitle")}</p>

          <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
            {t("doctorDetailBookingNote")}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder={t("doctorDetailReasonPlaceholder")}
            />
            <span
              className={`text-xs ${
                canBookWithNote ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              {t("doctorDetailBookingNoteHint").replace(
                "{count}",
                String(trimmedReasonLength)
              )}
            </span>
          </label>

          <div className="mt-5 space-y-4">
            {isSelfDoctor && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {t("doctorDetailSelfBookingDisabled")}
              </p>
            )}
            {groupedSlots.length === 0 ? (
              <p className="text-sm text-slate-500">{t("doctorDetailNoOpenSlots")}</p>
            ) : (
              groupedSlots.map((group) => (
                <div key={group.dayLabel}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.dayLabel}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {group.slots.slice(0, 8).map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => void bookSlot(slot)}
                        disabled={pendingSlot === slot.startsAt || isSelfDoctor || !canBookWithNote}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingSlot === slot.startsAt
                          ? t("doctorDetailBooking")
                          : new Date(slot.startsAt).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {bookingMessage && <p className="mt-4 text-sm text-emerald-600">{bookingMessage}</p>}
          {bookingError && <p className="mt-4 text-sm text-rose-600">{bookingError}</p>}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">{t("doctorDetailReviewsBreakdown")}</h2>
          <div className="mt-4 space-y-2">
            {doctor.ratingBreakdown.map((item) => {
              const percent =
                doctor.ratingCount > 0 ? Math.round((item.count / doctor.ratingCount) * 100) : 0;
              return (
                <div key={item.stars} className="grid grid-cols-[56px_1fr_48px] items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">{item.stars}★</span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{item.count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-800">{t("doctorDetailLeaveReview")}</p>
            <label className="mt-2 grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("doctorDetailRatingLabel")}
              <select
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {stars(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("doctorDetailCommentLabel")}
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                placeholder={t("doctorDetailCommentPlaceholder")}
              />
            </label>
            <button
              type="button"
              onClick={() => void submitReview()}
              className="mt-3 w-full rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              {t("doctorDetailSubmitReview")}
            </button>
            {reviewMessage && <p className="mt-2 text-sm text-emerald-600">{reviewMessage}</p>}
            {reviewError && <p className="mt-2 text-sm text-rose-600">{reviewError}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900">{t("doctorDetailPatientReviews")}</h2>
        <div className="mt-4 space-y-3">
          {doctor.reviews.length === 0 ? (
            <p className="text-sm text-slate-500">{t("doctorsNoReviews")}</p>
          ) : (
            doctor.reviews.slice(0, 20).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {stars(item.rating)}
                  </p>
                  {item.verifiedVisit && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      {t("doctorDetailVerifiedVisit")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">{item.comment}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.reviewerName} · {new Date(item.createdAt).toLocaleDateString(locale)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
