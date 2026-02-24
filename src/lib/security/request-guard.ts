function normalizeOrigin(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

function getExpectedOrigins(request: Request) {
  const origins = new Set<string>();
  const requestUrl = normalizeOrigin(request.url);
  if (requestUrl) {
    origins.add(requestUrl);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host) {
    const protocol =
      forwardedProto ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    origins.add(`${protocol}://${host}`.toLowerCase());
  }

  const configured = normalizeOrigin(process.env.NEXTAUTH_URL ?? null);
  if (configured) {
    origins.add(configured);
  }

  return origins;
}

export function hasTrustedOrigin(request: Request) {
  const origin = normalizeOrigin(request.headers.get("origin"));
  if (!origin) {
    return false;
  }

  return getExpectedOrigins(request).has(origin);
}

export function getClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");

  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();
  return ip || forwardedHost || host || "unknown";
}
