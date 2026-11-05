import Link from "next/link";
import { BadgeCheck, CircleCheckBig, Clock3, Heart, Receipt } from "lucide-react";
import { billStatus, percentFunded, remainingAmount } from "@/lib/bills";
import { getCategory } from "@/lib/categories";
import { daysLeft, formatDaysLeft, formatNaira } from "@/lib/format";
import type { Bill } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CoverImage } from "@/components/ui/CoverImage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BillCardMenu } from "./BillCardMenu";

export function BillCard({ bill, now, priority = false }: { bill: Bill; now: number; priority?: boolean }) {
  const status = billStatus(bill, now);
  const isOpen = status === "open";
  const pct = percentFunded(bill);
  const remaining = remainingAmount(bill);
  const category = getCategory(bill.category);
  const href = `/bills/${bill.id}`;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-cream-200 bg-white shadow-card">
      {/* Cover */}
      <div className="relative">
        <CoverImage
          src={bill.coverImageUrl}
          category={bill.category}
          sizes="(max-width: 520px) 82vw, 380px"
          priority={priority}
          className={`aspect-[16/10] ${isOpen ? "" : "saturate-[0.85]"}`}
        />
        <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-maroon-700/95 px-3 py-1.5 text-[0.8rem] font-semibold text-white shadow-soft backdrop-blur">
          <CategoryIcon category={bill.category} className="size-4" strokeWidth={2} />
          {category.label}
        </span>
        {isOpen ? (
          <span className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 rounded-full bg-gold-100/95 px-3 py-1.5 text-[0.78rem] font-semibold text-ink-900 shadow-soft backdrop-blur">
            <Clock3 className="size-3.5 text-gold-600" aria-hidden="true" />
            {formatDaysLeft(daysLeft(bill.deadline, now))}
          </span>
        ) : (
          <StatusBadge status={status} className="absolute top-3.5 right-3.5" />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <Avatar name={bill.owner.name} src={bill.owner.avatarUrl} size={44} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[0.95rem] font-semibold text-ink-900">
              {bill.owner.name}
              {bill.owner.verified && (
                <BadgeCheck className="size-4 shrink-0 fill-gold-500 text-white" aria-label="Verified" />
              )}
            </p>
            <p className="truncate text-[0.8rem] text-ink-500">{bill.owner.location}</p>
          </div>
          <BillCardMenu billId={bill.id} title={bill.title} />
        </div>

        <h3 className="mt-3.5 font-serif text-[1.3rem] leading-snug font-semibold text-ink-900">
          {/* Stretched link: the whole card opens the bill's details. */}
          <Link href={href} className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none">
            {bill.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-3 min-h-[4.1rem] text-[0.9rem] leading-relaxed text-ink-700">{bill.summary}</p>

        <dl className="mt-4 grid grid-cols-3 divide-x divide-cream-200">
          <div className="pr-3">
            <dt className="text-[0.75rem] text-ink-500">Total Bill</dt>
            <dd className="mt-0.5 text-[1.12rem] font-extrabold tracking-tight text-ink-900">
              {formatNaira(bill.totalAmount)}
            </dd>
          </div>
          <div className="px-3">
            <dt className="text-[0.75rem] text-ink-500">Raised</dt>
            <dd className="mt-0.5 text-[1rem] font-bold tracking-tight text-ink-900">{formatNaira(bill.raisedAmount)}</dd>
          </div>
          <div className="pl-3">
            <dt className="text-[0.75rem] text-ink-500">Remaining</dt>
            <dd className={`mt-0.5 text-[1rem] font-bold tracking-tight ${remaining === 0 ? "text-success-600" : "text-ink-900"}`}>
              {formatNaira(remaining)}
            </dd>
          </div>
        </dl>

        {bill.allowsPartialPayments ? (
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar percent={pct} complete={!isOpen} label={`${pct}% funded`} />
            <span className={`shrink-0 text-[0.75rem] font-semibold ${isOpen ? "text-ink-700" : "text-success-600"}`}>
              {pct}% funded
            </span>
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-1.5 text-[0.78rem] font-medium text-ink-500">
            <Receipt className="size-3.5 text-gold-600" aria-hidden="true" />
            Paid in full by one person, directly to {bill.payee.split(" – ")[0]}
          </p>
        )}

        <div className="mt-auto pt-4">
          {isOpen ? (
            <Link
              href={`${href}#contribute`}
              className="relative z-10 flex h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-2xl bg-maroon-700 text-[1.02rem] font-semibold text-white shadow-[0_10px_24px_-12px_rgb(110_34_29/0.9)] transition hover:bg-maroon-800 active:scale-[0.98]"
            >
              <Heart className="size-5" strokeWidth={2} aria-hidden="true" />
              {bill.allowsPartialPayments ? "Contribute" : `Pay Bill · ${formatNaira(remaining)}`}
            </Link>
          ) : (
            <p className="flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-success-100 text-[0.95rem] font-semibold text-success-600">
              <CircleCheckBig className="size-5" aria-hidden="true" />
              {status === "completed" ? "Bill paid — thank you, Village!" : "Fully funded — thank you!"}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
