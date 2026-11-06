import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, Crown, PartyPopper } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { PostBillForm } from "@/components/bills/PostBillForm";
import { BILL_LIMITS } from "@/lib/bill-limits";
import { requireUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { read } from "@/server/db/store";
import { billQuota } from "@/server/plans";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Post a bill" };

export default function NewBillPage({ searchParams }: PageProps<"/bills/new">) {
  return (
    <main className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <BackButton />
      <Suspense>
        <NewBill searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function NewBill({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/bills/new", "beneficiary");
  const { welcome } = await searchParams;
  const now = await requestTime();
  const day = 24 * 60 * 60 * 1000;
  const quota = billQuota(await read(), user.id, now);
  const isPlus = quota.plan.id === "plus";

  return (
    <>
      {welcome && (
        <p className="mt-5 flex animate-fade-up items-center gap-2.5 rounded-2xl bg-gold-100 p-4 text-sm text-ink-900">
          <PartyPopper className="size-5 shrink-0 text-gold-600" aria-hidden="true" />
          Welcome to VILLAGE, {user.fullName.split(" ")[0]}! Post your first bill below.
        </p>
      )}
      <h1 className="mt-5 font-serif text-[2rem] leading-tight font-semibold text-ink-900">Post a bill</h1>
      <p className="mt-1.5 text-ink-500">Tell your village what you need. Clear, honest bills get funded faster.</p>

      <div className="mt-5 mb-7 flex items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white px-4 py-3 text-sm">
        <span className="text-ink-700">
          <span className="font-bold text-ink-900 tabular-nums">
            {quota.used} of {quota.limit}
          </span>{" "}
          fundraiser{quota.limit === 1 ? "" : "s"} this week · {quota.open}/{quota.maxOpen} open
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${isPlus ? "bg-gold-500 text-white" : "bg-cream-100 text-ink-500"}`}>
          {quota.plan.label}
        </span>
      </div>

      {quota.allowed ? (
        <PostBillForm minDate={iso(now + day)} maxDate={iso(now + BILL_LIMITS.maxDays * day)} />
      ) : (
        <section className="flex flex-col items-center rounded-3xl border border-cream-200 bg-white p-6 text-center shadow-soft">
          <span className="grid size-14 place-items-center rounded-full bg-cream-100 text-maroon-700">
            <CalendarClock className="size-7" strokeWidth={1.7} aria-hidden="true" />
          </span>
          <h2 className="mt-3 font-serif text-xl font-semibold text-ink-900">You&apos;ve reached this week&apos;s limit</h2>
          <p className="mt-1.5 max-w-xs text-sm text-ink-700">{quota.reason}</p>
          {quota.nextSlotAt && (
            <p className="mt-2 text-sm text-ink-500">
              Your next slot opens on <strong className="text-ink-900">{formatDate(quota.nextSlotAt)}</strong>.
            </p>
          )}
          <p className="mt-3 max-w-xs text-xs text-ink-500">Limits keep the feed focused on genuine, urgent needs so every bill gets seen.</p>
          {!isPlus && (
            <Link
              href="/plus"
              className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 font-semibold text-white transition hover:bg-gold-600"
            >
              <Crown className="size-5" aria-hidden="true" /> Get more slots with Plus
            </Link>
          )}
          <Link href="/wallet" className="mt-2.5 flex h-13 w-full items-center justify-center rounded-2xl border border-maroon-700/30 font-semibold text-maroon-700 hover:bg-cream-100">
            See my bills
          </Link>
        </section>
      )}
    </>
  );
}
