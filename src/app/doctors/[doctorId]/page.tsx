"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";

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

function stars(value: number) {
  return "★".repeat(value) + "☆".repeat(5 - value);
}

export default function DoctorDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

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

  const loadDoctor = useCallback(async () => {
    if (!doctorId) {
      return;
    }
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/doctors/${doctorId}`, { cache: "no-store" });
    const payload = (await response.json()) as {
      doctor?: DoctorDetail;
      error?: string;
    };

    if (!response.ok || !payload.doctor) {
      setError(payload.error || "Could not load doctor profile.");
      setLoading(false);
      return;
    }

    setDoctor(payload.doctor);
    setLoading(false);
  }, [doctorId]);

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
      const key = new Date(slot.startsAt).toLocaleDateString(undefined, {
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
  }, [doctor]);

  async function toggleFavorite() {
    if (!doctor) {
      return;
    }
    if (!session) {
      router.push("/auth");
      return;
    }

    const response = await fetch(`/api/doctors/${doctor.id}/favorite`, {
      method: doctor.isFavorite ? "DELETE" : "POST",
    });

    if (!response.ok) {
      return;
    }

    setDoctor({ ...doctor, isFavorite: !doctor.isFavorite });
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
      setBookingError("You cannot book an appointment with yourself.");
      return;
    }

    setPendingSlot(slot.startsAt);
    setBookingError(null);
    setBookingMessage(null);

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
      setBookingError(payload.error || "Could not book this slot.");
      setPendingSlot(null);
      return;
    }

    setBookingMessage("Appointment booked. Check your notifications for updates.");
    setPendingSlot(null);
    setReason("");
    await loadDoctor();
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

    const response = await fetch(`/api/doctors/${doctor.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });

    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      setReviewError(payload.error || "Could not submit review.");
      return;
    }

    setReviewMessage("Review submitted.");
    setComment("");
    await loadDoctor();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Loading doctor profile...
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {error || "Doctor not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={doctor.name} src={doctor.avatarUrl} size={56} />
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{doctor.name}</h1>
              <p className="text-slate-600">
                {doctor.specialty || "General medicine"} · {doctor.city || "N/A"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {doctor.ratingCount > 0 && doctor.ratingAverage
                  ? `${doctor.ratingAverage}/5 from ${doctor.ratingCount} reviews`
                  : "No reviews yet"}
              </p>
              {searchParams.get("rebook") === "1" && (
                <p className="mt-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Quick rebooking mode
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                doctor.isFavorite
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {doctor.isFavorite ? "Favorited" : "Add to favorites"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/appointments")}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              My appointments
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Schedule and booking</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick a time slot. Conflicts are blocked automatically.
          </p>

          <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
            Booking note (optional)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Reason for visit"
            />
          </label>

          <div className="mt-5 space-y-4">
            {isSelfDoctor && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                You are viewing your own doctor profile. Self-booking is disabled.
              </p>
            )}
            {groupedSlots.length === 0 ? (
              <p className="text-sm text-slate-500">No open slots in the next 30 days.</p>
            ) : (
              groupedSlots.map((group) => (
                <div key={group.dayLabel}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.dayLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.slots.slice(0, 8).map((slot) => (
                      <button
                        key={slot.startsAt}
                        type="button"
                        onClick={() => void bookSlot(slot)}
                        disabled={pendingSlot === slot.startsAt || isSelfDoctor}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingSlot === slot.startsAt
                          ? "Booking..."
                          : new Date(slot.startsAt).toLocaleTimeString(undefined, {
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Reviews breakdown</h2>
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
            <p className="text-sm font-semibold text-slate-800">Leave a review</p>
            <label className="mt-2 grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rating
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
              Comment
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
                placeholder="Share your experience"
              />
            </label>
            <button
              type="button"
              onClick={() => void submitReview()}
              className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Submit review
            </button>
            {reviewMessage && <p className="mt-2 text-sm text-emerald-600">{reviewMessage}</p>}
            {reviewError && <p className="mt-2 text-sm text-rose-600">{reviewError}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Patient reviews</h2>
        <div className="mt-4 space-y-3">
          {doctor.reviews.length === 0 ? (
            <p className="text-sm text-slate-500">No reviews yet.</p>
          ) : (
            doctor.reviews.slice(0, 20).map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stars(item.rating)}
                </p>
                <p className="mt-1 text-sm text-slate-700">{item.comment}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.reviewerName} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
