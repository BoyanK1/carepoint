import { NextResponse } from "next/server";
import { Resend } from "resend";
import { FeedbackEmail } from "@/emails/FeedbackEmail";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";

const resend = new Resend(process.env.RESEND_API_KEY);
const FEEDBACK_WINDOW_SECONDS = 10 * 60;
const FEEDBACK_MAX_REQUESTS = 5;

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const rateLimit = await consumeRateLimit({
    namespace: "feedback",
    identifier: getClientIdentifier(request),
    windowSeconds: FEEDBACK_WINDOW_SECONDS,
    maxRequests: FEEDBACK_MAX_REQUESTS,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
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
  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be under 5000 characters." },
      { status: 400 }
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
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
