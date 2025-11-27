import NextAuth from "next-auth";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

// --- Login throttle -------------------------------------------------------
// 5 failed attempts per username per 15 minutes. This is an in-memory Map, so
// it is per server instance and resets on restart. A multi-instance or
// serverless production deployment needs a shared store (e.g. Redis/Upstash).
const MAX_FAILURES = 5;
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const MAX_THROTTLE_ENTRIES = 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function isThrottled(username: string, now: number): boolean {
  const entry = failures.get(username);
  if (!entry) return false;
  if (entry.resetAt <= now) {
    failures.delete(username);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(username: string, now: number): void {
  const entry = failures.get(username);
  if (entry && entry.resetAt > now) {
    entry.count += 1;
    return;
  }
  failures.delete(username);
  if (failures.size >= MAX_THROTTLE_ENTRIES) {
    for (const [key, value] of failures) {
      if (value.resetAt <= now) failures.delete(key);
    }
    // Still full: drop the oldest entries (Map keeps insertion order).
    while (failures.size >= MAX_THROTTLE_ENTRIES) {
      const oldest = failures.keys().next().value;
      if (oldest === undefined) break;
      failures.delete(oldest);
    }
  }
  failures.set(username, { count: 1, resetAt: now + THROTTLE_WINDOW_MS });
}

export function resetLoginThrottle(): void {
  failures.clear();
}

// bcrypt hash of a throwaway string, compared against when the username does
// not exist so response time does not reveal which usernames are valid.
const DUMMY_HASH =
  "$2b$10$.9cGIl5pVBdG7SkoNda8F.T/NcDZi8l7OV1LLKvRP0vOW1sA6SPDO";

export async function authorizeAdmin(
  credentials: Partial<Record<"username" | "password", unknown>> | undefined
) {
  if (!credentials?.username || !credentials?.password) {
    return null;
  }
  const username = credentials.username as string;
  const password = credentials.password as string;
  const now = Date.now();

  if (isThrottled(username, now)) {
    return null;
  }

  const admin = await prisma.admin.findUnique({ where: { username } });

  const passwordsMatch = await bcrypt.compare(
    password,
    admin ? admin.password : DUMMY_HASH
  );

  if (!admin || !passwordsMatch) {
    recordFailure(username, now);
    return null;
  }

  failures.delete(username);
  return {
    id: admin.id,
    username: admin.username,
    firstTimeLogin: admin.firstTimeLogin,
    passwordChangedAt: admin.passwordChangedAt.getTime(),
  };
}

// --- Session lifecycle ----------------------------------------------------
// Re-check the admin row at most once per minute per token.
const RECHECK_INTERVAL_MS = 60 * 1000;

function invalidate(token: JWT): JWT {
  delete token.id;
  delete token.username;
  delete token.firstTimeLogin;
  return token;
}

export async function jwtCallback({
  token,
  user,
}: {
  token: JWT;
  user?: User;
}): Promise<JWT> {
  if (user) {
    token.id = user.id;
    token.username = user.username;
    token.firstTimeLogin = user.firstTimeLogin;
    token.passwordChangedAt = user.passwordChangedAt;
    token.checkedAt = Date.now();
    return token;
  }

  if (!token.id) return token;

  const now = Date.now();
  if (token.checkedAt && now - token.checkedAt < RECHECK_INTERVAL_MS) {
    return token;
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: token.id },
      select: { firstTimeLogin: true, passwordChangedAt: true },
    });
    if (
      !admin ||
      admin.passwordChangedAt.getTime() > (token.passwordChangedAt ?? 0)
    ) {
      return invalidate(token);
    }
    token.firstTimeLogin = admin.firstTimeLogin;
    token.checkedAt = now;
    return token;
  } catch {
    // Fail closed: if we cannot confirm the admin still exists, no session.
    return invalidate(token);
  }
}

export async function sessionCallback({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Promise<Session> {
  if (token?.id && session.user) {
    session.user.id = token.id;
    session.user.username = token.username as string;
    if (token.firstTimeLogin !== undefined) {
      session.user.firstTimeLogin = token.firstTimeLogin;
    }
  }
  return session;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      authorize: (credentials) => authorizeAdmin(credentials),
    }),
  ],
  callbacks: {
    jwt: jwtCallback,
    session: sessionCallback,
  },
});
