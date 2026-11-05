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

const LAGOS = "Africa/Lagos";

/** "Just now", "5m ago", "3h ago", "2d ago", then a date. */
export function formatRelative(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/** Morning / afternoon / evening in Nigerian time. */
export function greeting(now: number): string {
  const hour = Number(new Intl.DateTimeFormat("en-NG", { hour: "numeric", hourCycle: "h23", timeZone: LAGOS }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** "2026-11" in Nigerian time — for monthly buckets. */
export function monthKey(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: LAGOS }).formatToParts(ms);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { month: "short", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 15));
}
