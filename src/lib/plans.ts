/**
 * Posting allowances per plan. Change the numbers here — every limit check and every
 * "x of y used" label reads from this table.
 *
 * Windows are rolling (the last 7 × 24 hours), so a slot frees up exactly a week after it was used.
 */
export const PLANS = {
  free: {
    id: "free",
    label: "Free",
    billsPerWeek: 1,
    maxOpenBills: 2,
    contractsPerWeek: 2,
  },
  plus: {
    id: "plus",
    label: "VILLAGE Plus",
    billsPerWeek: 4,
    maxOpenBills: 6,
    contractsPerWeek: 10,
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanId];

export const QUOTA_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Everything else Plus includes, for the upgrade page. */
export const PLUS_PERKS = [
  `Post up to ${PLANS.plus.billsPerWeek} fundraisers a week (Free: ${PLANS.free.billsPerWeek})`,
  `Keep up to ${PLANS.plus.maxOpenBills} fundraisers open at once (Free: ${PLANS.free.maxOpenBills})`,
  `Offer up to ${PLANS.plus.contractsPerWeek} contracts a week in Pro rooms (Free: ${PLANS.free.contractsPerWeek})`,
  "A Plus badge on your bills, messages and contracts",
] as const;
