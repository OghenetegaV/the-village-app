import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check, Crown } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { CancelButton, SubscribeButton } from "@/components/pro/PlusActions";
import { formatDate, formatNaira } from "@/lib/format";
import { PLANS, PLUS_PERKS } from "@/lib/plans";
import { getCurrentUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { read } from "@/server/db/store";
import { billQuota, contractQuota, isPlusActive, subscriptionOf } from "@/server/plans";
import { getPlusPlan } from "@/server/payments/subscriptions";
import type { PlanInterval } from "@/server/payments/paystack";

export const metadata: Metadata = { title: "VILLAGE Plus" };

const PER: Record<PlanInterval, string> = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  biannually: "6 months",
  annually: "year",
};

export default function PlusPage() {
  return (
    <main className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <BackButton fallback="/account" />
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70" />}>
        <Plus />
      </Suspense>
    </main>
  );
}

async function Plus() {
  const [user, now, plan, db] = await Promise.all([getCurrentUser(), requestTime(), getPlusPlan(), read()]);
  const sub = user ? subscriptionOf(db, user.id) : null;
  const active = isPlusActive(sub, now);
  const price = plan ? `${formatNaira(plan.amount / 100)}/${PER[plan.interval]}` : null;

  return (
    <>
      <section className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-maroon-700 p-6 text-white shadow-card">
        <div aria-hidden="true" className="absolute -top-16 -right-14 size-48 rounded-full bg-gold-500/25" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 text-xs font-extrabold tracking-wider">
            <Crown className="size-3.5" aria-hidden="true" /> VILLAGE PLUS
          </span>
          <h1 className="mt-3 font-serif text-[1.9rem] leading-tight font-semibold">More room to ask, more room to work</h1>
          {price && <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{price}</p>}

          <ul className="mt-4 space-y-2.5">
            {PLUS_PERKS.map((perk) => (
              <li key={perk} className="flex gap-2.5 text-sm leading-relaxed text-white/90">
                <Check className="mt-0.5 size-4 shrink-0 text-gold-400" strokeWidth={3} aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {!user ? (
              <Link href="/login?next=/plus" className="flex h-14 items-center justify-center rounded-2xl bg-white font-semibold text-maroon-700 hover:bg-cream-100">
                Sign in to subscribe
              </Link>
            ) : active ? (
              <p className="rounded-2xl bg-white/10 p-4 text-sm">
                <span className="block font-semibold">You&apos;re on VILLAGE Plus 🎉</span>
                {sub?.status === "non_renewing" ? "Cancelled — your Plus slots last until " : "Renews on "}
                {formatDate(sub!.currentPeriodEnd)}.
              </p>
            ) : price ? (
              <SubscribeButton priceLabel={price} />
            ) : (
              <p className="rounded-2xl bg-white/10 p-4 text-sm text-white/85">VILLAGE Plus is coming soon. Check back shortly.</p>
            )}
          </div>
        </div>
      </section>

      {user && <Usage userId={user.id} now={now} db={db} />}

      {user && active && sub?.status === "active" && (
        <div className="mt-6 text-center">
          <CancelButton />
        </div>
      )}

      <section aria-labelledby="compare" className="mt-8">
        <h2 id="compare" className="font-serif text-xl font-semibold text-ink-900">
          Free vs Plus
        </h2>
        <table className="mt-3 w-full overflow-hidden rounded-2xl border border-cream-200 bg-white text-sm">
          <thead className="bg-cream-100 text-xs text-ink-500">
            <tr>
              <th className="p-3 text-left font-semibold">Each week</th>
              <th className="p-3 text-right font-semibold">Free</th>
              <th className="p-3 text-right font-semibold text-gold-600">Plus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            <CompareRow label="New fundraisers" free={PLANS.free.billsPerWeek} plus={PLANS.plus.billsPerWeek} />
            <CompareRow label="Open fundraisers at once" free={PLANS.free.maxOpenBills} plus={PLANS.plus.maxOpenBills} />
            <CompareRow label="Contracts offered in Pro rooms" free={PLANS.free.contractsPerWeek} plus={PLANS.plus.contractsPerWeek} />
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-500">Weeks are rolling: a slot frees up 7 days after you use it.</p>
      </section>
    </>
  );
}

function Usage({ userId, now, db }: { userId: string; now: number; db: Awaited<ReturnType<typeof read>> }) {
  const bills = billQuota(db, userId, now);
  const contracts = contractQuota(db, userId, now);
  const bar = (used: number, limit: number) => (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-200" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}>
      <div className="h-full rounded-full bg-maroon-700" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
    </div>
  );
  return (
    <section aria-label="Your usage this week" className="mt-6 grid grid-cols-2 gap-3">
      <div className="rounded-3xl border border-cream-200 bg-white p-4">
        <p className="text-xs text-ink-500">Fundraisers this week</p>
        <p className="mt-1 text-lg font-extrabold tabular-nums text-ink-900">
          {bills.used}/{bills.limit}
        </p>
        {bar(bills.used, bills.limit)}
      </div>
      <div className="rounded-3xl border border-cream-200 bg-white p-4">
        <p className="text-xs text-ink-500">Contracts this week</p>
        <p className="mt-1 text-lg font-extrabold tabular-nums text-ink-900">
          {contracts.used}/{contracts.limit}
        </p>
        {bar(contracts.used, contracts.limit)}
      </div>
    </section>
  );
}

function CompareRow({ label, free, plus }: { label: string; free: number; plus: number }) {
  return (
    <tr>
      <td className="p-3 text-ink-700">{label}</td>
      <td className="p-3 text-right font-semibold tabular-nums text-ink-900">{free}</td>
      <td className="p-3 text-right font-extrabold tabular-nums text-gold-600">{plus}</td>
    </tr>
  );
}
