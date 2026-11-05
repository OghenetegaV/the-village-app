import type { Naira } from "./types";

/**
 * Non-overlapping, half-open ranges: [min, max).
 * ₦10,000 belongs to "10k-50k", ₦50,000 to "50k-100k", ₦100,000 to "100k-plus".
 */
export const PRICE_RANGES = [
  { id: "under-10k", label: "Less than ₦10,000", lines: ["Less than", "₦10,000"], min: 0, max: 10_000 },
  { id: "10k-50k", label: "₦10,000 – ₦50,000", lines: ["₦10,000 –", "₦50,000"], min: 10_000, max: 50_000 },
  { id: "50k-100k", label: "₦50,000 – ₦100,000", lines: ["₦50,000 –", "₦100,000"], min: 50_000, max: 100_000 },
  { id: "100k-plus", label: "₦100,000 and above", lines: ["₦100,000", "and above"], min: 100_000, max: Infinity },
] as const;

export type PriceRangeId = (typeof PRICE_RANGES)[number]["id"];

export function isPriceRangeId(value: unknown): value is PriceRangeId {
  return typeof value === "string" && PRICE_RANGES.some((r) => r.id === value);
}

export function getPriceRange(id: PriceRangeId) {
  return PRICE_RANGES.find((r) => r.id === id)!;
}

export function isInPriceRange(amount: Naira, id: PriceRangeId): boolean {
  const range = getPriceRange(id);
  return amount >= range.min && amount < range.max;
}
