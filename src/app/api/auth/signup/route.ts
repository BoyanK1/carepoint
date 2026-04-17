import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { getClientIdentifier, hasTrustedOrigin } from "@/lib/security/request-guard";
import { hashEmail, normalizeUserEmail } from "@/lib/security/pii";

const SIGNUP_WINDOW_SECONDS = 15 * 60;
const MAX_SIGNUPS_PER_WINDOW = 8;
const MAX_NAME_LENGTH = 120;
const MAX_CITY_LENGTH = 120;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string) {
  if (password.length < 10) {
    return false;
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSymbol;
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeUserEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";

  const rateLimit = await consumeRateLimit({
    namespace: "signup",
    identifier: `${getClientIdentifier(request)}:${email || "unknown"}`,
    windowSeconds: SIGNUP_WINDOW_SECONDS,
    maxRequests: MAX_SIGNUPS_PER_WINDOW,
  });

  if (rateLimit.error) {
    return NextResponse.json({ error: "Rate limit service unavailable." }, { status: 503 });
  }

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 10 chars and include uppercase, lowercase, number, and symbol.",
      },
      { status: 400 }
    );
  }

  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: "Name must be under 120 characters." },
      { status: 400 }
    );
  }

  if (city.length > MAX_CITY_LENGTH) {
    return NextResponse.json(
      { error: "City must be under 120 characters." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();
  // Supabase Auth handles secure password hashing/salting internally.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    console.error("Signup failed:", error.message);
    return NextResponse.json({ error: "Sign up failed." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (admin && data.user) {
    const profilePayload = {
      id: data.user.id,
      full_name: name || null,
      email: null,
      email_hash: hashEmail(email),
      city: city || null,
      role: "patient",
    };

    const upsertWithHash = await admin.from("user_profiles").upsert(profilePayload);
    if (upsertWithHash.error) {
      const message = upsertWithHash.error.message.toLowerCase();
      const missingHashColumn =
        message.includes("email_hash") &&
        (message.includes("column") || message.includes("does not exist"));

      if (missingHashColumn) {
        await admin.from("user_profiles").upsert({
          id: data.user.id,
          full_name: name || null,
          email: null,
          city: city || null,
          role: "patient",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, user: data.user });
}
