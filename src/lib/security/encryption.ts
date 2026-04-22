import "server-only";
import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const IV_BYTES = 12;

function getEncryptionKey() {
  const secret = process.env.APPOINTMENT_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("APPOINTMENT_ENCRYPTION_KEY or NEXTAUTH_SECRET must be configured.");
  }

  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function isEncryptedValue(value: string | null | undefined) {
  return Boolean(value?.startsWith(ENCRYPTION_PREFIX));
}

export function encryptSensitiveText(value: string | null | undefined) {
  if (!value || isEncryptedValue(value)) {
    return value ?? null;
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSensitiveText(value: string | null | undefined) {
  if (!value || !isEncryptedValue(value)) {
    return value ?? null;
  }

  const [, ivText, tagText, ciphertextText] = value.split(".");
  if (!ivText || !tagText || !ciphertextText) {
    return "[Encrypted content unavailable]";
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(ivText, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    return "[Encrypted content unavailable]";
  }
}
