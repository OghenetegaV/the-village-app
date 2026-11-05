import type { Bill, BillStatus, Naira } from "./types";
import type { CategoryId } from "./categories";
import { isInPriceRange, type PriceRangeId } from "./price-ranges";
import { formatNaira } from "./format";

/** Smallest contribution accepted, in naira. */
export const MIN_CONTRIBUTION: Naira = 100;

export function remainingAmount(bill: Pick<Bill, "totalAmount" | "raisedAmount">): Naira {
  return Math.max(0, bill.totalAmount - bill.raisedAmount);
}

export function percentFunded(bill: Pick<Bill, "totalAmount" | "raisedAmount">): number {
  if (bill.totalAmount <= 0) return 0;
  const pct = (bill.raisedAmount / bill.totalAmount) * 100;
  // Never show 100% until it is really fully funded.
  return bill.raisedAmount >= bill.totalAmount ? 100 : Math.min(99, Math.floor(pct));
}

export function billStatus(bill: Bill, now: number): BillStatus {
  if (bill.removedAt) return "removed";
  if (bill.completedAt) return "completed";
  if (bill.raisedAmount >= bill.totalAmount) return "funded";
  if (new Date(bill.deadline).getTime() < now) return "expired";
  return "open";
}

export function acceptsPayments(bill: Bill, now: number): boolean {
  return billStatus(bill, now) === "open";
}

export interface BillFilters {
  category: CategoryId | null;
  price: PriceRangeId | null;
}

export function filterBills<T extends Bill>(bills: T[], { category, price }: BillFilters): T[] {
  return bills.filter(
    (b) => (category === null || b.category === category) && (price === null || isInPriceRange(b.totalAmount, price)),
  );
}

/**
 * Feed order: open bills first (closest to their deadline first), then fully funded, then completed.
 * Expired bills that never got funded, and bills removed by an admin, are not shown in discovery.
 */
export function sortForFeed(bills: Bill[], now: number): Bill[] {
  const rank: Record<BillStatus, number> = { open: 0, funded: 1, completed: 2, expired: 3, removed: 4 };
  return bills
    .filter((b) => {
      const s = billStatus(b, now);
      return s !== "expired" && s !== "removed";
    })
    .sort((a, b) => {
      const r = rank[billStatus(a, now)] - rank[billStatus(b, now)];
      if (r !== 0) return r;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
}

/** Validates a requested contribution against the bill's current state. Returns an error message or null. */
export function validateContribution(bill: Bill, amount: number, now: number): string | null {
  if (!acceptsPayments(bill, now)) return "This bill is no longer accepting payments.";
  if (!Number.isInteger(amount)) return "Enter a whole naira amount.";
  const remaining = remainingAmount(bill);
  if (!bill.allowsPartialPayments) {
    return amount === remaining ? null : `This bill must be paid in full (${formatNaira(remaining)}).`;
  }
  if (amount < Math.min(MIN_CONTRIBUTION, remaining)) return `The minimum contribution is ${formatNaira(MIN_CONTRIBUTION)}.`;
  if (amount > remaining) return `Only ${formatNaira(remaining)} is still needed.`;
  return null;
}
