/** Rules for bills posted by beneficiaries (shared by the form and the server action). */
export const BILL_LIMITS = {
  minAmount: 500,
  maxAmount: 10_000_000,
  maxDays: 90,
  titleMax: 80,
  summaryMax: 180,
  storyMin: 50,
  storyMax: 3000,
} as const;
