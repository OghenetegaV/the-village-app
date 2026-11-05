import type { Metadata } from "next";
import { Suspense } from "react";
import { Award, CircleCheckBig, HandCoins, HandHeart, HeartHandshake, Lock, ReceiptText, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ColumnChart, HorizontalBarChart } from "@/components/charts/BarCharts";
import { EmptyPanel, PageTitle, SectionHeader, SignInPrompt, StatTile } from "@/components/ui/Blocks";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Avatar } from "@/components/ui/Avatar";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { formatNaira, formatNairaCompact, formatRelative, monthLabel } from "@/lib/format";
import type { Bill, Payment, PublicUser } from "@/lib/types";
import { getCurrentUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { beneficiaryImpact, snapshot, supporterImpact, villageStats } from "@/server/insights";

export const metadata: Metadata = { title: "Impact" };

export default function ImpactPage() {
  return (
    <>
      <AppHeader />
      <PageTitle title="Your impact" subtitle="The difference you and your village are making." />
      <Suspense fallback={<div className="mx-4 mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70 sm:mx-6" />}>
        <Impact />
      </Suspense>
    </>
  );
}

async function Impact() {
  const [now, user, db] = await Promise.all([requestTime(), getCurrentUser(), snapshot()]);
  return (
    <div className="space-y-8 px-4 pt-5 sm:px-6">
      {!user ? (
        <VillageImpact bills={db.bills} now={now} />
      ) : user.role === "supporter" ? (
        <SupporterView user={user} bills={db.bills} payments={db.payments} now={now} />
      ) : (
        <BeneficiaryView user={user} bills={db.bills} payments={db.payments} now={now} />
      )}
    </div>
  );
}

function VillageImpact({ bills, now }: { bills: Bill[]; now: number }) {
  const stats = villageStats(bills, now);
  const byCategory = CATEGORIES.map((c) => ({
    key: c.id,
    label: c.label,
    value: bills.filter((b) => b.category === c.id).reduce((s, b) => s + b.raisedAmount, 0),
    icon: <CategoryIcon category={c.id} className="size-3.5 shrink-0 text-gold-600" />,
  }));
  return (
    <>
      <section className="grid grid-cols-2 gap-2.5">
        <StatTile label="Raised together" value={formatNaira(stats.totalRaised)} icon={HandCoins} />
        <StatTile label="People helped" value={String(stats.peopleHelped)} icon={UsersRound} tone="light" />
      </section>
      <section aria-labelledby="where-heading" className="rounded-3xl border border-cream-200 bg-white p-5">
        <h2 id="where-heading" className="font-serif text-lg font-semibold text-ink-900">
          Where the village&apos;s money goes
        </h2>
        <p className="mb-4 text-xs text-ink-500">Total raised by category</p>
        <HorizontalBarChart data={byCategory} caption="Total raised by category" />
      </section>
      <SignInPrompt icon={HeartHandshake} title="Track your own impact" text="Sign in to see everything you've given, the bills you've helped and the milestones you've earned." next="/impact" />
    </>
  );
}

function SupporterView({ user, bills, payments, now }: { user: PublicUser; bills: Bill[]; payments: Payment[]; now: number }) {
  const impact = supporterImpact(user.id, bills, payments, now);
  const earned = impact.milestones.filter((m) => m.achieved).length;

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5">
        <StatTile label="Total given" value={formatNaira(impact.totalGiven)} icon={HandCoins} />
        <StatTile label="Bills helped" value={String(impact.billsHelped)} icon={UsersRound} tone="light" />
        <StatTile label="Contributions" value={String(impact.contributions)} icon={HandHeart} tone="light" />
        <StatTile label="Bills you completed" value={String(impact.billsCompleted)} icon={CircleCheckBig} tone="light" />
      </section>

      {impact.contributions === 0 ? (
        <EmptyPanel
          icon={HandHeart}
          title="Your story starts here"
          text="Once you contribute to a bill, you'll see where your money went and how it's grown over time."
          cta={{ href: "/bills", label: "Find a bill to pay" }}
        />
      ) : (
        <>
          <section aria-labelledby="month-heading" className="rounded-3xl border border-cream-200 bg-white p-5">
            <h2 id="month-heading" className="font-serif text-lg font-semibold text-ink-900">
              Giving over time
            </h2>
            <p className="mb-5 text-xs text-ink-500">Confirmed contributions, last 6 months</p>
            <ColumnChart
              caption="Confirmed contributions per month, last 6 months"
              data={impact.byMonth.map((m) => ({ key: m.month, label: monthLabel(m.month), value: m.amount }))}
            />
          </section>

          <section aria-labelledby="cat-heading" className="rounded-3xl border border-cream-200 bg-white p-5">
            <h2 id="cat-heading" className="font-serif text-lg font-semibold text-ink-900">
              Where your money went
            </h2>
            <p className="mb-4 text-xs text-ink-500">Your confirmed contributions by category</p>
            <HorizontalBarChart
              caption="Your confirmed contributions by category"
              data={impact.byCategory.map((c) => ({
                key: c.category,
                label: getCategory(c.category).label,
                value: c.amount,
                icon: <CategoryIcon category={c.category} className="size-3.5 shrink-0 text-gold-600" />,
              }))}
            />
          </section>
        </>
      )}

      <section aria-labelledby="milestones-heading">
        <SectionHeader id="milestones-heading" title="Milestones" />
        <p className="mt-0.5 text-sm text-ink-500">
          {earned} of {impact.milestones.length} earned
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {impact.milestones.map((m) => (
            <li
              key={m.id}
              className={`rounded-3xl border p-4 ${m.achieved ? "border-gold-400 bg-gold-100" : "border-cream-200 bg-white"}`}
            >
              <span
                className={`grid size-10 place-items-center rounded-full ${m.achieved ? "bg-gold-500 text-white" : "bg-cream-100 text-ink-400"}`}
              >
                {m.achieved ? <Award className="size-5" aria-hidden="true" /> : <Lock className="size-4.5" aria-hidden="true" />}
              </span>
              <p className="mt-2.5 font-semibold text-ink-900">{m.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{m.description}</p>
              {!m.achieved && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-cream-200" aria-label={`${Math.round(m.progress * 100)}% of the way`}>
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${m.progress * 100}%` }} />
                </div>
              )}
              <span className="sr-only">{m.achieved ? "Earned" : "Not yet earned"}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function BeneficiaryView({ user, bills, payments, now }: { user: PublicUser; bills: Bill[]; payments: Payment[]; now: number }) {
  const impact = beneficiaryImpact(user.id, bills, payments, now);
  return (
    <>
      <section className="grid grid-cols-2 gap-2.5">
        <StatTile label="Raised for you" value={formatNaira(impact.totalRaised)} icon={HandCoins} />
        <StatTile label="Supporters" value={String(impact.supporters)} icon={UsersRound} tone="light" />
        <StatTile label="Of what you need" value={impact.totalRequested ? `${Math.floor((impact.totalRaised / impact.totalRequested) * 100)}%` : "—"} icon={ReceiptText} tone="light" />
        <StatTile label="Bills funded" value={String(impact.billsFunded)} icon={CircleCheckBig} tone="light" />
      </section>

      {impact.bills.length > 0 && (
        <section aria-labelledby="bills-chart-heading" className="rounded-3xl border border-cream-200 bg-white p-5">
          <h2 id="bills-chart-heading" className="font-serif text-lg font-semibold text-ink-900">
            Raised per bill
          </h2>
          <p className="mb-4 text-xs text-ink-500">Confirmed contributions to each of your bills</p>
          <HorizontalBarChart
            caption="Amount raised per bill"
            stacked
            data={impact.bills.map((b) => ({ key: b.id, label: b.title, value: b.raisedAmount }))}
          />
        </section>
      )}

      <section aria-labelledby="thanks-heading">
        <SectionHeader id="thanks-heading" title="People who helped you" />
        {impact.recent.length === 0 ? (
          <div className="mt-3">
            <EmptyPanel
              icon={HeartHandshake}
              title="No contributions yet"
              text="Share your bill with friends and family — every confirmed contribution will appear here."
              cta={impact.bills.length ? { href: `/bills/${impact.bills[0].id}`, label: "View your bill" } : { href: "/bills/new", label: "Post a bill" }}
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-cream-200 rounded-3xl border border-cream-200 bg-white">
            {impact.recent.map((c) => (
              <li key={c.reference} className="flex items-center gap-3 p-4">
                <Avatar name={c.name ?? "Anonymous"} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink-900">{c.name ?? "Anonymous supporter"}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {c.billTitle} · {formatRelative(c.at, now)}
                  </span>
                </span>
                <span className="font-bold text-ink-900 tabular-nums">{formatNairaCompact(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
