import "server-only";
import { PLANS, QUOTA_WINDOW_MS, type Plan, type PlanId } from "@/lib/plans";
import { billStatus } from "@/lib/bills";
import type { Subscription } from "@/lib/types";
import type { DatabaseShape } from "./db/store";

/* ------------------------------------------------------------- Plan */

export function subscriptionOf(db: Pick<DatabaseShape, "subscriptions">, userId: string): Subscription | null {
  return db.subscriptions.find((s) => s.userId === userId) ?? null;
}

/** Plus is active while the paid period lasts — including after cancelling (non-renewing). */
export function isPlusActive(sub: Subscription | null, now: number): boolean {
  return Boolean(sub && sub.status !== "expired" && new Date(sub.currentPeriodEnd).getTime() > now);
}

export function planIdFor(db: Pick<DatabaseShape, "subscriptions">, userId: string, now: number): PlanId {
  return isPlusActive(subscriptionOf(db, userId), now) ? "plus" : "free";
}

/** Set of user ids with an active Plus subscription — for showing badges in lists. */
export function plusUserIds(db: Pick<DatabaseShape, "subscriptions">, now: number): Set<string> {
  return new Set(db.subscriptions.filter((s) => isPlusActive(s, now)).map((s) => s.userId));
}

/* ----------------------------------------------------------- Quotas */

export interface Quota {
  plan: Plan;
  used: number;
  limit: number;
  /** When the oldest counted post leaves the window — i.e. when a slot frees up. */
  nextSlotAt: string | null;
  allowed: boolean;
  /** Why posting is blocked, in plain language. */
  reason: string | null;
}

function windowQuota(plan: Plan, timestamps: string[], limit: number, now: number, noun: string): Quota {
  const since = now - QUOTA_WINDOW_MS;
  const inWindow = timestamps.map((t) => new Date(t).getTime()).filter((t) => t > since).sort((a, b) => a - b);
  const used = inWindow.length;
  const allowed = used < limit;
  const nextSlotAt = used >= limit ? new Date(inWindow[used - limit] + QUOTA_WINDOW_MS).toISOString() : null;
  return {
    plan,
    used,
    limit,
    nextSlotAt,
    allowed,
    reason: allowed ? null : `You've used all ${limit} ${noun}${limit === 1 ? "" : "s"} for this week on ${plan.label}.`,
  };
}

/**
 * Fundraising allowance. Counts every bill posted in the last 7 days — removed ones included, so
 * deleting and re-posting doesn't reset the allowance — plus a cap on bills open at the same time.
 */
export function billQuota(db: DatabaseShape, userId: string, now: number): Quota & { open: number; maxOpen: number } {
  const plan = PLANS[planIdFor(db, userId, now)];
  const mine = db.bills.filter((b) => b.ownerId === userId);
  const weekly = windowQuota(plan, mine.map((b) => b.createdAt), plan.billsPerWeek, now, "fundraiser");
  const open = mine.filter((b) => billStatus(b, now) === "open").length;
  if (weekly.allowed && open >= plan.maxOpenBills) {
    return {
      ...weekly,
      open,
      maxOpen: plan.maxOpenBills,
      allowed: false,
      reason: `You already have ${open} open fundraiser${open === 1 ? "" : "s"} — the most allowed on ${plan.label}. Close or finish one first.`,
    };
  }
  return { ...weekly, open, maxOpen: plan.maxOpenBills };
}

export function contractQuota(db: DatabaseShape, userId: string, now: number): Quota {
  const plan = PLANS[planIdFor(db, userId, now)];
  const mine = db.contracts.filter((c) => c.posterId === userId);
  return windowQuota(plan, mine.map((c) => c.createdAt), plan.contractsPerWeek, now, "contract post");
}
