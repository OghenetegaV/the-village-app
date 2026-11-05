import { BadgeCheck, CircleCheckBig } from "lucide-react";
import type { BillStatus } from "@/lib/types";

/** Shown for bills that no longer need money. Returns null for open bills. */
export function StatusBadge({ status, className = "" }: { status: BillStatus; className?: string }) {
  if (status === "funded") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-success-600 px-3 py-1.5 text-xs font-bold text-white shadow-soft ${className}`}
      >
        <CircleCheckBig className="size-3.5" aria-hidden="true" />
        Fully funded
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white shadow-soft ${className}`}
      >
        <BadgeCheck className="size-3.5" aria-hidden="true" />
        Bill paid
      </span>
    );
  }
  return null;
}
