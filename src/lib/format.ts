const nairaFormatter = new Intl.NumberFormat("en-NG", {
  maximumFractionDigits: 0,
});

/** ₦350,000 — always the naira sign, no decimals, grouped thousands. */
export function formatNaira(amount: number): string {
  return `₦${nairaFormatter.format(Math.max(0, Math.round(amount)))}`;
}

/** ₦350k / ₦1.2m — for tight spaces only. */
export function formatNairaCompact(amount: number): string {
  if (amount >= 1_000_000) return `₦${trim(amount / 1_000_000)}m`;
  if (amount >= 1_000) return `₦${trim(amount / 1_000)}k`;
  return formatNaira(amount);
}

function trim(n: number) {
  return n.toFixed(1).replace(/\.0$/, "");
}

const DAY = 24 * 60 * 60 * 1000;

export function daysLeft(deadlineIso: string, now: number): number {
  return Math.ceil((new Date(deadlineIso).getTime() - now) / DAY);
}

export function formatDaysLeft(days: number): string {
  if (days <= 0) return "Ends today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
