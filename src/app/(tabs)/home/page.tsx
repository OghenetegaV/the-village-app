import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, HandHeart, HeartHandshake, PlusCircle, ReceiptText, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BillRow, MiniBillCard } from "@/components/bills/CompactBill";
import { ActivityFeed } from "@/components/community/ActivityFeed";
import { SectionHeader, StatTile } from "@/components/ui/Blocks";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { billStatus, percentFunded, sortForFeed } from "@/lib/bills";
import { CATEGORIES } from "@/lib/categories";
import { formatNaira, formatNairaCompact, greeting } from "@/lib/format";
import type { Bill, Payment, PublicUser } from "@/lib/types";
import { getCurrentUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { activityFeed, beneficiaryImpact, snapshot, supporterImpact, villageStats } from "@/server/insights";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<HomeSkeleton />}>
        <Home />
      </Suspense>
    </>
  );
}

async function Home() {
  const [now, user, db] = await Promise.all([requestTime(), getCurrentUser(), snapshot()]);
  const open = sortForFeed(db.bills, now).filter((b) => billStatus(b, now) === "open");
  const endingSoon = open.slice(0, 6);
  const almostThere = open
    .filter((b) => b.allowsPartialPayments && percentFunded(b) >= 60)
    .sort((a, b) => percentFunded(b) - percentFunded(a))
    .slice(0, 3);
  const stats = villageStats(db.bills, now);

  return (
    <div className="space-y-9 px-4 pt-4 sm:px-6">
      {user ? <Welcome user={user} now={now} bills={db.bills} payments={db.payments} /> : <Hero />}

      <section aria-label="The village so far" className="grid grid-cols-3 gap-2.5">
        <MiniStat label="Raised together" value={formatNairaCompact(stats.totalRaised)} />
        <MiniStat label="Bills funded" value={String(stats.billsFunded)} />
        <MiniStat label="Contributions" value={stats.contributions.toLocaleString("en-NG")} />
      </section>

      {endingSoon.length > 0 && (
        <section aria-labelledby="ending-heading">
          <SectionHeader id="ending-heading" title="Ending soon" href="/bills" />
          <div className="no-scrollbar -mx-4 mt-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
            {endingSoon.map((b) => (
              <MiniBillCard key={b.id} bill={b} now={now} />
            ))}
          </div>
        </section>
      )}

      {almostThere.length > 0 && (
        <section aria-labelledby="almost-heading">
          <SectionHeader id="almost-heading" title="Almost there" />
          <p className="mt-0.5 text-sm text-ink-500">Your contribution could be the one that finishes it.</p>
          <div className="mt-3 divide-y divide-cream-200 rounded-3xl border border-cream-200 bg-white">
            {almostThere.map((b) => (
              <BillRow key={b.id} bill={b} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="browse-heading">
        <SectionHeader id="browse-heading" title="Browse by category" />
        <div className="mt-3 grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3">
          {CATEGORIES.map((c) => {
            const count = open.filter((b) => b.category === c.id).length;
            return (
              <Link
                key={c.id}
                href={`/bills?category=${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white p-3.5 transition hover:border-maroon-700/40 hover:shadow-soft"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream-100 text-maroon-700">
                  <CategoryIcon category={c.id} className="size-5" strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink-900">{c.label}</span>
                  <span className="block text-xs text-ink-500">
                    {count} open bill{count === 1 ? "" : "s"}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="activity-heading">
        <SectionHeader id="activity-heading" title="Happening now" href="/community" linkLabel="Community" />
        <div className="mt-3">
          <ActivityFeed events={activityFeed(db.bills, db.payments, 4)} now={now} filterable={false} />
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-maroon-700 p-6 text-white shadow-card">
      <div aria-hidden="true" className="absolute -top-16 -right-16 size-48 rounded-full bg-gold-500/20" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-10 size-44 rounded-full bg-maroon-600/60" />
      <div className="relative">
        <p className="text-xs font-bold tracking-[0.18em] text-gold-400">REAL PEOPLE · REAL NEEDS</p>
        <h1 className="mt-2 font-serif text-[1.9rem] leading-tight font-semibold">Pay a bill. Change a life.</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Hospital bills, school fees, electricity — real needs from real people. Help directly, or ask your village for help.
        </p>
        <div className="mt-5 grid gap-2.5">
          <Link
            href="/register?role=supporter"
            className="flex h-13 items-center justify-between rounded-2xl bg-white px-4 font-semibold text-maroon-700 transition hover:bg-cream-100"
          >
            <span className="flex items-center gap-2.5">
              <HandHeart className="size-5" aria-hidden="true" /> I want to help
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/register?role=beneficiary"
            className="flex h-13 items-center justify-between rounded-2xl border border-white/30 px-4 font-semibold text-white transition hover:bg-white/10"
          >
            <span className="flex items-center gap-2.5">
              <ReceiptText className="size-5" aria-hidden="true" /> I need help with a bill
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Welcome({ user, now, bills, payments }: { user: PublicUser; now: number; bills: Bill[]; payments: Payment[] }) {
  const first = user.fullName.split(" ")[0];

  if (user.role === "supporter") {
    const impact = supporterImpact(user.id, bills, payments, now);
    return (
      <section>
        <h1 className="font-serif text-[1.9rem] leading-tight font-semibold text-ink-900">
          {greeting(now)}, {first}
        </h1>
        <p className="mt-1 text-ink-500">
          {impact.contributions ? "Thank you for showing up for your village." : "Ready to make your first difference?"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <StatTile label="You've given" value={formatNaira(impact.totalGiven)} icon={HeartHandshake} />
          <StatTile label="Bills helped" value={String(impact.billsHelped)} icon={UsersRound} tone="light" />
        </div>
        <Link
          href="/bills"
          className="mt-3 flex h-13 items-center justify-center gap-2 rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800"
        >
          <HandHeart className="size-5" aria-hidden="true" /> Find a bill to pay
        </Link>
      </section>
    );
  }

  const impact = beneficiaryImpact(user.id, bills, payments, now);
  const active = impact.bills.find((b) => b.status === "open") ?? impact.bills[0];
  return (
    <section>
      <h1 className="font-serif text-[1.9rem] leading-tight font-semibold text-ink-900">
        {greeting(now)}, {first}
      </h1>
      <p className="mt-1 text-ink-500">{active ? "Here's how your bill is doing." : "Let your village know what you need."}</p>
      {active ? (
        <Link href={`/bills/${active.id}`} className="mt-4 block rounded-3xl bg-maroon-700 p-5 text-white shadow-card">
          <p className="flex items-center gap-1.5 text-xs text-white/70">
            <CategoryIcon category={active.category} className="size-3.5 text-gold-400" /> Your bill
          </p>
          <p className="mt-1 truncate font-serif text-lg font-semibold">{active.title}</p>
          <div className="mt-3 [&_[role=progressbar]]:bg-white/20">
            <ProgressBar percent={active.percent} complete={active.status !== "open"} label={`${active.percent}% funded`} />
          </div>
          <p className="mt-2 text-sm text-white/80">
            <span className="font-bold text-white tabular-nums">{formatNaira(active.raisedAmount)}</span> of {formatNaira(active.totalAmount)} ·{" "}
            {active.contributorCount} supporter{active.contributorCount === 1 ? "" : "s"}
          </p>
        </Link>
      ) : null}
      <Link
        href="/bills/new"
        className={`mt-3 flex h-13 items-center justify-center gap-2 rounded-2xl font-semibold transition ${
          active ? "border border-maroon-700/30 text-maroon-700 hover:bg-cream-100" : "bg-maroon-700 text-white hover:bg-maroon-800"
        }`}
      >
        <PlusCircle className="size-5" aria-hidden="true" /> {active ? "Post another bill" : "Post your first bill"}
      </Link>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-100 px-3 py-3 text-center">
      <p className="text-lg font-extrabold tracking-tight text-ink-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[0.7rem] text-ink-500">{label}</p>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6 px-4 pt-4 sm:px-6" aria-busy="true">
      <div className="h-64 animate-pulse rounded-[1.75rem] bg-cream-200/70" />
      <div className="h-20 animate-pulse rounded-2xl bg-cream-200/70" />
      <div className="h-52 animate-pulse rounded-3xl bg-cream-200/70" />
    </div>
  );
}
