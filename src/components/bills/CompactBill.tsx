import Link from "next/link";
import { Clock3 } from "lucide-react";
import { percentFunded, remainingAmount } from "@/lib/bills";
import { daysLeft, formatDaysLeft, formatNaira } from "@/lib/format";
import type { Bill } from "@/lib/types";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CoverImage } from "@/components/ui/CoverImage";
import { ProgressBar } from "@/components/ui/ProgressBar";

/** Small vertical card for horizontal shelves. */
export function MiniBillCard({ bill, now }: { bill: Bill; now: number }) {
  const pct = percentFunded(bill);
  return (
    <Link
      href={`/bills/${bill.id}`}
      className="flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-cream-200 bg-white shadow-soft transition hover:shadow-card"
    >
      <div className="relative">
        <CoverImage src={bill.coverImageUrl} category={bill.category} sizes="224px" className="aspect-[16/9]" />
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-gold-100/95 px-2.5 py-1 text-[0.7rem] font-semibold text-ink-900">
          <Clock3 className="size-3 text-gold-600" aria-hidden="true" />
          {formatDaysLeft(daysLeft(bill.deadline, now))}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-2 font-serif leading-snug font-semibold text-ink-900">{bill.title}</p>
        <p className="mt-0.5 truncate text-xs text-ink-500">{bill.owner.name}</p>
        <div className="mt-auto pt-3">
          <ProgressBar percent={pct} label={`${pct}% funded`} />
          <p className="mt-1.5 text-xs text-ink-500">
            <span className="font-bold tabular-nums text-ink-900">{formatNaira(remainingAmount(bill))}</span> to go
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Horizontal row for lists. */
export function BillRow({ bill }: { bill: Bill }) {
  const pct = percentFunded(bill);
  return (
    <Link href={`/bills/${bill.id}`} className="flex items-center gap-3 p-4 transition hover:bg-cream-50">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-100 text-maroon-700">
        <CategoryIcon category={bill.category} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold text-ink-900">{bill.title}</span>
          <span className="shrink-0 text-xs font-bold text-maroon-700 tabular-nums">{pct}%</span>
        </span>
        <span className="mt-2 block">
          <ProgressBar percent={pct} label={`${pct}% funded`} />
        </span>
        <span className="mt-1.5 block text-xs text-ink-500">
          Only <span className="font-bold tabular-nums text-ink-900">{formatNaira(remainingAmount(bill))}</span> left · {bill.owner.name}
        </span>
      </span>
    </Link>
  );
}
