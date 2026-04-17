export function getSafeInternalRedirect(
  target: string | null | undefined,
  fallback = "/"
) {
  const value = target?.trim();
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\0")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "http://carepoint.local");
    if (parsed.origin !== "http://carepoint.local") {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
