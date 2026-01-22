import { NextResponse } from "next/server";
import { Resend } from "resend";
import { FeedbackEmail } from "@/emails/FeedbackEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
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
