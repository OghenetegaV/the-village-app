import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role } from "@/lib/roles";
import type { PublicUser, User } from "@/lib/types";
import { read, transaction } from "../db/store";

const COOKIE = "village_session";
const SESSION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function toPublicUser(user: User): PublicUser {
  const { id, role, fullName, email, phone, location, createdAt } = user;
  return { id, role, fullName, email, phone, location, createdAt };
}

/** Creates a session and sets the cookie. Call only from Server Actions or Route Handlers. */
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_DAYS * DAY);

  await transaction((db) => {
    // Opportunistic cleanup of expired sessions.
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
    db.sessions.push({ id: hashToken(token), userId, createdAt: new Date(now).toISOString(), expiresAt: expiresAt.toISOString() });
  });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const id = hashToken(token);
    await transaction((db) => {
      db.sessions = db.sessions.filter((s) => s.id !== id);
    });
  }
  jar.delete(COOKIE);
}

/** The signed-in user for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const { sessions, users } = await read();
  const session = sessions.find((s) => s.id === hashToken(token));
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const user = users.find((u) => u.id === session.userId);
  return user ? toPublicUser(user) : null;
});

/** Redirects to login (returning here afterwards) when signed out; optionally enforces a role. */
export async function requireUser(returnTo: string, role?: Role): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (role && user.role !== role) redirect(`/account?notice=${role}-only`);
  return user;
}

/** Only allows same-site relative paths, preventing open redirects via ?next=. */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
