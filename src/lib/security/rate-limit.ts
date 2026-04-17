import { createHash } from "node:crypto";
import { getSupabaseClient } from "@/lib/supabase/client";

type RateLimitOptions = {
  namespace: string;
  identifier: string;
  windowSeconds: number;
  maxRequests: number;
};

type RateLimitResult = {
  allowed: boolean;
  error?: string;
};

type RateLimitRpcClient = ReturnType<typeof getSupabaseClient> & {
  rpc: (
    fn: "check_rate_limit",
    params: {
      p_key: string;
      p_window_seconds: number;
      p_max_requests: number;
    }
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
};

function hashIdentifier(identifier: string) {
  return createHash("sha256").update(identifier).digest("hex");
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const key = `${options.namespace}:${hashIdentifier(options.identifier)}`;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await (supabase as RateLimitRpcClient).rpc("check_rate_limit", {
      p_key: key,
      p_window_seconds: options.windowSeconds,
      p_max_requests: options.maxRequests,
    });

    if (error) {
      console.error("Rate limit RPC error:", error.message);
      return { allowed: false, error: "Rate limit service unavailable." };
    }

    return { allowed: Boolean(data) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rate limiter failed.";
    console.error("Rate limiter unavailable:", message);
    return { allowed: false, error: "Rate limit service unavailable." };
  }
}
