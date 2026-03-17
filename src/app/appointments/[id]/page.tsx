"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/Avatar";
import { useLanguage } from "@/components/LanguageProvider";

interface AppointmentDetail {
  id: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  reason: string | null;
  paymentStatus: string | null;
  depositAmount: number | null;
  paidAt: string | null;
  patient: {
    id: string;
    name: string;
    city: string | null;
    avatarUrl: string | null;
  } | null;
  doctor: {
    id: string;
    userId: string;
    name: string;
    specialty: string | null;
    city: string | null;
    avatarUrl: string | null;
  } | null;
  access: {
    isPatient: boolean;
    isDoctor: boolean;
    isAdmin: boolean;
  };
}

interface AppointmentMessage {
  id: string;
  senderUserId: string;
  senderName: string;
  message: string;
  createdAt: string;
  mine: boolean;
}

interface AppointmentFile {
  id: string;
  uploaderUserId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  url: string | null;
}

const statusClasses: Record<string, string> = {
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number | null, locale: string) {
  if (!bytes || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
      bytes / 1024
    )} KB`;
  }

  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    bytes / (1024 * 1024)
  )} MB`;
}

export default function AppointmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status } = useSession();
  const { t, lang } = useLanguage();
  const locale = lang === "bg" ? "bg-BG" : "en-US";

  const appointmentId = params?.id ?? "";
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [messages, setMessages] = useState<AppointmentMessage[]>([]);
  const [files, setFiles] = useState<AppointmentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAction, setPendingAction] = useState<"cancel" | "reschedule" | "payment" | null>(
    null
  );
  const [rescheduleAt, setRescheduleAt] = useState("");

  const getStatusLabel = useCallback(
    (value: string) => {
      switch (value) {
        case "scheduled":
          return t("statusScheduled");
        case "confirmed":
          return t("statusConfirmed");
        case "completed":
          return t("statusCompleted");
        case "cancelled":
          return t("statusCancelled");
        default:
          return t("statusAll");
      }
    },
    [t]
  );

  const loadAppointment = useCallback(async () => {
    const response = await fetch(`/api/appointments/${appointmentId}`, { cache: "no-store" });
    const payload = (await response.json()) as {
      appointment?: AppointmentDetail;
      error?: string;
    };

    if (!response.ok || !payload.appointment) {
      throw new Error(payload.error || t("appointmentDetailLoadError"));
    }

    setAppointment(payload.appointment);
    setRescheduleAt(toDateTimeLocal(payload.appointment.startsAt));
  }, [appointmentId, t]);

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/appointments/${appointmentId}/messages`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      messages?: AppointmentMessage[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || t("appointmentDetailMessagesLoadError"));
    }
    setMessages(payload.messages ?? []);
  }, [appointmentId, t]);

  const loadFiles = useCallback(async () => {
    const response = await fetch(`/api/appointments/${appointmentId}/files`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      files?: AppointmentFile[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || t("appointmentDetailFilesLoadError"));
    }
    setFiles(payload.files ?? []);
  }, [appointmentId, t]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadAppointment(), loadMessages(), loadFiles()]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("appointmentDetailLoadError"));
    } finally {
      setLoading(false);
    }
  }, [loadAppointment, loadFiles, loadMessages, t]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth");
      return;
    }

    if (status === "authenticated" && appointmentId) {
      void loadAll();
    }
  }, [status, router, appointmentId, loadAll]);

  const badgeClass = statusClasses[appointment?.status ?? "scheduled"] ?? statusClasses.scheduled;
  const canEdit = Boolean(
    appointment?.access.isPatient &&
      appointment &&
      ["scheduled", "confirmed"].includes(appointment.status)
  );
  const canPay = Boolean(
    appointment?.access.isPatient &&
      appointment &&
      ["scheduled", "confirmed"].includes(appointment.status) &&
      appointment.paymentStatus !== "paid"
  );

  const paymentLabel = useMemo(() => {
    if (!appointment?.paymentStatus) {
      return t("appointmentDetailPaymentUnpaid");
    }
    if (appointment.paymentStatus === "paid") {
      return t("appointmentDetailPaymentPaid");
    }
    if (appointment.paymentStatus === "refunded") {
      return t("appointmentDetailPaymentRefunded");
    }
    return appointment.paymentStatus;
  }, [appointment?.paymentStatus, t]);

  async function handleCancel() {
    if (!appointment) {
      return;
    }
    setPendingAction("cancel");
    setError(null);
    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || t("appointmentsUpdateError"));
      setPendingAction(null);
      return;
    }
    setPendingAction(null);
    await loadAll();
  }

  async function handleReschedule() {
    if (!appointment) {
      return;
    }

    const nextStart = new Date(rescheduleAt);
    if (Number.isNaN(nextStart.getTime())) {
      setError(t("appointmentsUpdateError"));
      return;
    }

    setPendingAction("reschedule");
    setError(null);
    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", startsAt: nextStart.toISOString() }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || t("appointmentsUpdateError"));
      setPendingAction(null);
      return;
    }
    setPendingAction(null);
    await loadAll();
  }

  async function handlePayDeposit() {
    if (!appointment) {
      return;
    }

    setPendingAction("payment");
    setError(null);

    const response = await fetch(`/api/appointments/${appointment.id}/payment`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || t("appointmentDetailPaymentError"));
      setPendingAction(null);
      return;
    }
    setPendingAction(null);
    await loadAll();
  }

  async function sendMessage() {
    if (!messageText.trim()) {
      return;
    }
    setSendingMessage(true);
    setError(null);
    const response = await fetch(`/api/appointments/${appointmentId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: messageText }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || t("appointmentDetailMessagesSendError"));
      setSendingMessage(false);
      return;
    }
    setMessageText("");
    setSendingMessage(false);
    await loadMessages();
  }

  async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploadingFile(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/appointments/${appointmentId}/files`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || t("appointmentDetailFilesUploadError"));
      setUploadingFile(false);
      return;
    }
    setUploadingFile(false);
    await loadFiles();
  }

  async function deleteFile(fileId: string) {
    const response = await fetch(
      `/api/appointments/${appointmentId}/files?fileId=${encodeURIComponent(fileId)}`,
      { method: "DELETE" }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error || t("appointmentDetailFilesDeleteError"));
      return;
    }
    await loadFiles();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("appointmentDetailLoading")}
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:gap-8 lg:py-12">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("appointmentDetailBadge")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {formatDate(appointment.startsAt, locale)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              {appointment.doctor?.name || t("appointmentsDoctorFallback")}
              {appointment.doctor?.specialty ? ` · ${appointment.doctor.specialty}` : ""}
              {appointment.doctor?.city ? ` · ${appointment.doctor.city}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {appointment.doctor && (
              <Avatar name={appointment.doctor.name} src={appointment.doctor.avatarUrl} size={48} />
            )}
            <span
              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
            >
              {getStatusLabel(appointment.status)}
            </span>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t("appointmentDetailOverview")}</h2>
            <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("appointmentDetailDateTime")}
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatDate(appointment.startsAt, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("appointmentDetailPaymentStatus")}
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{paymentLabel}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("appointmentDetailReason")}
                </dt>
                <dd className="mt-1 text-slate-700">{appointment.reason || t("appointmentsNoNote")}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                href={`/api/appointments/${appointment.id}/calendar`}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                {t("appointmentDetailAddCalendar")}
              </Link>
              {canPay && (
                <button
                  type="button"
                  onClick={() => void handlePayDeposit()}
                  disabled={pendingAction === "payment"}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingAction === "payment"
                    ? t("appointmentDetailPaying")
                    : t("appointmentDetailPayDeposit").replace(
                        "{amount}",
                        String(appointment.depositAmount ?? 20)
                      )}
                </button>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">{t("appointmentDetailChatTitle")}</h2>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-500">{t("appointmentDetailChatEmpty")}</p>
              ) : (
                messages.map((item) => (
                  <article
                    key={item.id}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      item.mine
                        ? "ml-auto border border-slate-900 bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p className="text-xs font-semibold opacity-80">{item.senderName}</p>
                    <p className="mt-1 whitespace-pre-wrap">{item.message}</p>
                    <p className="mt-1 text-[11px] opacity-75">
                      {new Date(item.createdAt).toLocaleString(locale)}
                    </p>
                  </article>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value.slice(0, 2000))}
                placeholder={t("appointmentDetailChatPlaceholder")}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={sendingMessage || !messageText.trim()}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingMessage ? t("appointmentDetailChatSending") : t("appointmentDetailChatSend")}
              </button>
            </div>
          </article>
        </div>

        <div className="space-y-6">
          {canEdit && (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">{t("appointmentDetailManage")}</h2>
              <label className="mt-4 grid gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("appointmentsPickNewDateTime")}
                <input
                  type="datetime-local"
                  value={rescheduleAt}
                  onChange={(event) => setRescheduleAt(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-300"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleReschedule()}
                  disabled={pendingAction === "reschedule"}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingAction === "reschedule"
                    ? t("appointmentsPleaseWait")
                    : t("appointmentsReschedule")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={pendingAction === "cancel"}
                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingAction === "cancel" ? t("appointmentsPleaseWait") : t("appointmentsCancel")}
                </button>
              </div>
            </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{t("appointmentDetailFilesTitle")}</h2>
              <label className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:text-slate-900">
                {uploadingFile ? t("appointmentDetailFilesUploading") : t("appointmentDetailFilesUpload")}
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => void uploadFile(event)}
                  disabled={uploadingFile}
                />
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {files.length === 0 ? (
                <p className="text-sm text-slate-500">{t("appointmentDetailFilesEmpty")}</p>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{file.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(file.sizeBytes, locale)} ·{" "}
                        {new Date(file.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          {t("appointmentDetailFilesOpen")}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteFile(file.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300"
                      >
                        {t("appointmentDetailFilesDelete")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
