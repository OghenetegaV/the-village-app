import "server-only";
import { billStatus, percentFunded } from "@/lib/bills";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { monthKey } from "@/lib/format";
import type { Bill, BillStatus, Naira, Payment } from "@/lib/types";
import { read } from "./db/store";

/* ---------------------------------------------------------------- Village */

export interface VillageStats {
  totalRaised: Naira;
  billsFunded: number;
  peopleHelped: number;
  contributions: number;
  openBills: number;
}

export function villageStats(bills: Bill[], now: number): VillageStats {
  return {
    totalRaised: bills.reduce((s, b) => s + b.raisedAmount, 0),
    billsFunded: bills.filter((b) => b.raisedAmount >= b.totalAmount).length,
    peopleHelped: bills.filter((b) => b.raisedAmount > 0).length,
    contributions: bills.reduce((s, b) => s + b.contributorCount, 0),
    openBills: bills.filter((b) => billStatus(b, now) === "open").length,
  };
}

/* ------------------------------------------------------------- Activity */

export type ActivityKind = "contribution" | "posted" | "funded" | "completed";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  bill: Pick<Bill, "id" | "title" | "category"> & { ownerName: string };
  /** Contributor's display name; null = anonymous. Only for contributions. */
  actor?: string | null;
  amount?: Naira;
}

export function activityFeed(bills: Bill[], payments: Payment[], limit = 40): ActivityEvent[] {
  const ref = (b: Bill) => ({ id: b.id, title: b.title, category: b.category, ownerName: b.owner.name });
  const events: ActivityEvent[] = [];

  for (const b of bills) {
    if (b.removedAt) continue;
    events.push({ id: `posted:${b.id}`, kind: "posted", at: b.createdAt, bill: ref(b) });
    if (b.fundedAt) events.push({ id: `funded:${b.id}`, kind: "funded", at: b.fundedAt, bill: ref(b), amount: b.totalAmount });
    if (b.completedAt) events.push({ id: `completed:${b.id}`, kind: "completed", at: b.completedAt, bill: ref(b), amount: b.totalAmount });
  }
  for (const p of payments) {
    if (p.status !== "success") continue;
    const b = bills.find((x) => x.id === p.billId);
    if (!b || b.removedAt) continue;
    // Never expose emails or user ids publicly — only the name the contributor chose to show.
    events.push({ id: `pay:${p.reference}`, kind: "contribution", at: p.confirmedAt ?? p.createdAt, bill: ref(b), actor: p.displayName, amount: p.amount });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/* ------------------------------------------------------------- Supporter */

export interface Milestone {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  /** 0–1 progress towards the milestone. */
  progress: number;
}

export interface SupporterImpact {
  totalGiven: Naira;
  contributions: number;
  billsHelped: number;
  billsCompleted: number;
  byCategory: { category: CategoryId; amount: Naira }[];
  byMonth: { month: string; amount: Naira }[];
  milestones: Milestone[];
}

export function supporterImpact(userId: string, bills: Bill[], payments: Payment[], now: number): SupporterImpact {
  const mine = payments.filter((p) => p.userId === userId && p.status === "success");
  const totalGiven = mine.reduce((s, p) => s + p.amount, 0);
  const helpedIds = new Set(mine.map((p) => p.billId));
  const billsCompleted = mine.filter((p) => p.completedBill).length;

  const byCategory = CATEGORIES.map((c) => ({
    category: c.id,
    amount: mine.filter((p) => bills.find((b) => b.id === p.billId)?.category === c.id).reduce((s, p) => s + p.amount, 0),
  }));
  const categoriesHelped = byCategory.filter((c) => c.amount > 0).length;

  // Last 6 months including the current one, oldest first.
  const months: string[] = [];
  const cursor = new Date(now);
  for (let i = 0; i < 6; i++) {
    months.unshift(monthKey(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 15)));
  }
  const byMonth = months.map((month) => ({
    month,
    amount: mine.filter((p) => monthKey(new Date(p.confirmedAt ?? p.createdAt).getTime()) === month).reduce((s, p) => s + p.amount, 0),
  }));

  const ms = (id: string, title: string, description: string, value: number, target: number): Milestone => ({
    id,
    title,
    description,
    achieved: value >= target,
    progress: Math.min(1, value / target),
  });

  return {
    totalGiven,
    contributions: mine.length,
    billsHelped: helpedIds.size,
    billsCompleted,
    byCategory,
    byMonth,
    milestones: [
      ms("first", "First step", "Make your first contribution", mine.length, 1),
      ms("closer", "Bill closer", "Make the payment that fully funds a bill", billsCompleted, 1),
      ms("ten-k", "₦10k giver", "Give ₦10,000 in total", totalGiven, 10_000),
      ms("five-bills", "Village pillar", "Help 5 different bills", helpedIds.size, 5),
      ms("all-round", "All-rounder", "Help bills in 3 different categories", categoriesHelped, 3),
      ms("fifty-k", "₦50k champion", "Give ₦50,000 in total", totalGiven, 50_000),
    ],
  };
}

/* ----------------------------------------------------------- Beneficiary */

export interface ReceivedContribution {
  reference: string;
  name: string | null;
  amount: Naira;
  at: string;
  billTitle: string;
}

export interface BeneficiaryImpact {
  totalRaised: Naira;
  totalRequested: Naira;
  supporters: number;
  billsFunded: number;
  bills: (Bill & { status: BillStatus; percent: number })[];
  recent: ReceivedContribution[];
}

export function beneficiaryImpact(userId: string, bills: Bill[], payments: Payment[], now: number): BeneficiaryImpact {
  const mine = bills.filter((b) => b.ownerId === userId);
  const ids = new Set(mine.map((b) => b.id));
  const received = payments.filter((p) => ids.has(p.billId) && p.status === "success");
  return {
    totalRaised: mine.reduce((s, b) => s + b.raisedAmount, 0),
    totalRequested: mine.reduce((s, b) => s + b.totalAmount, 0),
    supporters: new Set(received.map((p) => p.userId ?? p.reference)).size,
    billsFunded: mine.filter((b) => b.raisedAmount >= b.totalAmount).length,
    bills: mine
      .map((b) => ({ ...b, status: billStatus(b, now), percent: percentFunded(b) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    recent: received
      .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt))
      .slice(0, 20)
      .map((p) => ({
        reference: p.reference,
        name: p.displayName,
        amount: p.amount,
        at: p.confirmedAt ?? p.createdAt,
        billTitle: mine.find((b) => b.id === p.billId)!.title,
      })),
  };
}

/* --------------------------------------------------------------- Wallet */

export type PayoutStage = "raising" | "awaiting_payout" | "paid_out" | "closed";

export function payoutStage(bill: Bill, now: number): PayoutStage {
  const status = billStatus(bill, now);
  if (status === "completed") return "paid_out";
  if (status === "funded") return "awaiting_payout";
  if (status === "expired" || status === "removed") return "closed";
  return "raising";
}

export async function snapshot() {
  return read();
}
