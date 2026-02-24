import { createHmac } from "node:crypto";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getHashSecret() {
  return process.env.NEXTAUTH_SECRET ?? null;
}

export function hashEmail(email: string) {
  const secret = getHashSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(normalizeEmail(email)).digest("hex");
}

export function normalizeUserEmail(email: string) {
  return normalizeEmail(email);
}
