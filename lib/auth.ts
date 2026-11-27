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

// Reserve an attempt slot synchronously (before any await) so concurrent
// requests cannot all pass the check. A successful login deletes the entry.
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
  const username = credentials?.username;
  const password = credentials?.password;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length < 1 ||
    username.length > 100 ||
    password.length < 1 ||
    password.length > 72
  ) {
    return null;
  }
  const now = Date.now();

  if (isThrottled(username, now)) {
    return null;
  }
  // Take the slot now, before the first await; refunded on success below.
  recordFailure(username, now);

  const admin = await prisma.admin.findUnique({ where: { username } });

  const passwordsMatch = await bcrypt.compare(
    password,
    admin ? admin.password : DUMMY_HASH
  );

  if (!admin || !passwordsMatch) {
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

// Server-side verification cache, so the 60 s recheck does not depend on the
// token cookie being re-issued (route handlers calling auth() do not forward
// refreshed cookies). Per instance; bounded, oldest evicted first.
interface AdminVerification {
  exists: boolean;
  passwordChangedAt: number;
  firstTimeLogin: boolean;
  checkedAt: number;
}
const MAX_VERIFICATION_ENTRIES = 100;
const verificationCache = new Map<string, AdminVerification>();

function cacheVerification(id: string, entry: AdminVerification): void {
  verificationCache.delete(id);
  while (verificationCache.size >= MAX_VERIFICATION_ENTRIES) {
    const oldest = verificationCache.keys().next().value;
    if (oldest === undefined) break;
    verificationCache.delete(oldest);
  }
  verificationCache.set(id, entry);
}

// Per-admin generation, bumped whenever the entry is refreshed from a password
// change. A DB lookup only writes the cache if the generation is unchanged, so
// a lookup that started before a change can never overwrite fresher data.
const generations = new Map<string, number>();
const inflight = new Map<string, Promise<AdminVerification | null>>();

export function resetAdminVerificationCache(): void {
  verificationCache.clear();
  generations.clear();
  inflight.clear();
}

async function verifyAdmin(id: string): Promise<AdminVerification | null> {
  const cached = verificationCache.get(id);
  if (cached && Date.now() - cached.checkedAt < RECHECK_INTERVAL_MS) {
    return cached;
  }
  let pending = inflight.get(id);
  if (!pending) {
    pending = (async () => {
      const gen = generations.get(id) ?? 0;
      const admin = await prisma.admin.findUnique({
        where: { id },
        select: { firstTimeLogin: true, passwordChangedAt: true },
      });
      if ((generations.get(id) ?? 0) !== gen) {
        // A password change landed while we were querying: our result may be
        // stale. Use the fresh entry it wrote, or fail closed if there is none.
        return verificationCache.get(id) ?? null;
      }
      const v: AdminVerification = {
        exists: !!admin,
        passwordChangedAt: admin ? admin.passwordChangedAt.getTime() : 0,
        firstTimeLogin: admin ? admin.firstTimeLogin : false,
        checkedAt: Date.now(),
      };
      cacheVerification(id, v);
      return v;
    })().finally(() => inflight.delete(id));
    inflight.set(id, pending);
  }
  return pending;
}

// Called after a password change so it takes effect immediately on this
// instance (other instances converge within the 60 s TTL).
export function refreshAdminVerification(admin: {
  id: string;
  passwordChangedAt: Date;
  firstTimeLogin: boolean;
}): void {
  generations.set(admin.id, (generations.get(admin.id) ?? 0) + 1);
  cacheVerification(admin.id, {
    exists: true,
    passwordChangedAt: admin.passwordChangedAt.getTime(),
    firstTimeLogin: admin.firstTimeLogin,
    checkedAt: Date.now(),
  });
}

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
    return token;
  }

  if (!token.id) return token;

  let v: AdminVerification | null;
  try {
    v = await verifyAdmin(token.id);
  } catch {
    // Fail closed (and failures are not cached).
    return invalidate(token);
  }
  if (!v) return invalidate(token);

  if (!v.exists || v.passwordChangedAt > (token.passwordChangedAt ?? 0)) {
    return invalidate(token);
  }
  token.firstTimeLogin = v.firstTimeLogin;
  return token;
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
