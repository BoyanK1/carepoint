import { NextResponse } from "next/server";
import { Resend } from "resend";
import { FeedbackEmail } from "@/emails/FeedbackEmail";

const resend = new Resend(process.env.RESEND_API_KEY);
const FEEDBACK_WINDOW_MS = 10 * 60 * 1000;
const FEEDBACK_MAX_REQUESTS = 5;
const feedbackRateMap = new Map<string, { count: number; startedAt: number }>();

function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip || forwardedHost || "unknown";
}

function isRateLimited(identifier: string) {
  const now = Date.now();
  const current = feedbackRateMap.get(identifier);
  if (!current || now - current.startedAt > FEEDBACK_WINDOW_MS) {
    feedbackRateMap.set(identifier, { count: 1, startedAt: now });
    return false;
  }

  if (current.count >= FEEDBACK_MAX_REQUESTS) {
    return true;
  }

  feedbackRateMap.set(identifier, {
    count: current.count + 1,
    startedAt: current.startedAt,
  });
  return false;
}

export async function POST(request: Request) {
  if (isRateLimited(getClientIdentifier(request))) {
    return NextResponse.json(
      { error: "Too many feedback requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (message.length < 5) {
    return NextResponse.json(
      { error: "Message must be at least 5 characters." },
      { status: 400 }
    );
  }

  if (!process.env.FEEDBACK_TO_EMAIL) {
    return NextResponse.json(
      { error: "FEEDBACK_TO_EMAIL is not configured." },
      { status: 500 }
    );
  }

  try {
    const { error } = await resend.emails.send({
      from: "CarePoint <onboarding@resend.dev>",
      to: process.env.FEEDBACK_TO_EMAIL,
      subject: "New CarePoint feedback",
      replyTo: email || undefined,
      react: FeedbackEmail({ name, email, message }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
