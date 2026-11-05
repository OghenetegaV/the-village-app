import "server-only";
import { notFound, redirect } from "next/navigation";
import type { PublicUser } from "@/lib/types";
import { getCurrentUser } from "./session";

/**
 * Admins are configured on the server, never chosen at sign-up:
 *   VILLAGE_ADMIN_EMAILS=ops@village.ng,amaka@village.ng
 * An admin keeps their normal Supporter/Beneficiary account and gains the admin console.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.VILLAGE_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdmin(user: Pick<PublicUser, "email"> | null | undefined): boolean {
  return Boolean(user && adminEmails().has(user.email.toLowerCase()));
}

/**
 * Page guard: signed-out visitors go to login; signed-in non-admins get a 404 so the console's
 * existence isn't advertised.
 */
export async function requireAdminPage(returnTo: string): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!isAdmin(user)) notFound();
  return user;
}

/** Action guard: Server Actions are public endpoints, so every admin action must call this. */
export async function requireAdminAction(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) throw new Error("Not authorized");
  return user;
}
