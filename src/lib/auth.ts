import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeUserEmail } from "@/lib/security/pii";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const SIGNIN_WINDOW_SECONDS = 15 * 60;
const MAX_SIGNIN_ATTEMPTS = 10;

function readHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
) {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (Array.isArray(direct)) {
    return direct[0] ?? null;
  }
  return direct ?? null;
}

function getSignInIdentifier(
  headers: Record<string, string | string[] | undefined> | undefined,
  email: string
) {
  const forwardedFor = readHeader(headers, "x-forwarded-for");
  const realIp = readHeader(headers, "x-real-ip");
  const forwardedHost = readHeader(headers, "x-forwarded-host");
  const host = readHeader(headers, "host");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp?.trim();
  return `${ip || forwardedHost || host || "unknown"}:${normalizeUserEmail(email)}`;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const rateLimit = await consumeRateLimit({
          namespace: "signin",
          identifier: getSignInIdentifier(req.headers, email),
          windowSeconds: SIGNIN_WINDOW_SECONDS,
          maxRequests: MAX_SIGNIN_ATTEMPTS,
        });

        if (rateLimit.error || !rateLimit.allowed) {
          return null;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeUserEmail(email),
          password,
        });

        if (error || !data.user) {
          return null;
        }

        const name =
          data.user.user_metadata?.full_name || data.user.email || "User";

        return {
          id: data.user.id,
          email: data.user.email,
          name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth",
  },
};
