import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, Check, Clock3, HandCoins, Landmark, ReceiptText, ShieldCheck, WalletMinimal } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { EmptyPanel, PageTitle, SectionHeader, SignInPrompt, StatTile } from "@/components/ui/Blocks";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { formatDate, formatNaira, monthKey, monthLabel } from "@/lib/format";
import type { Bill, Payment, PublicUser } from "@/lib/types";
import { getCurrentUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { payoutStage, snapshot, type PayoutStage } from "@/server/insights";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <>
      <AppHeader />
      <PageTitle title="Wallet" subtitle="Every naira, accounted for." />
      <Suspense fallback={<div className="mx-4 mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70 sm:mx-6" />}>
        <Wallet />
      </Suspense>
    </>
  );
}

async function Wallet() {
  const [now, user, db] = await Promise.all([requestTime(), getCurrentUser(), snapshot()]);
  return (
    <div className="space-y-8 px-4 pt-5 sm:px-6">
      {!user ? (
        <SignInPrompt
          icon={WalletMinimal}
          title="Your payments, in one place"
          text="Sign in to see your receipts, payment history and — if you've posted bills — your payouts."
          next="/wallet"
        />
      ) : user.role === "supporter" ? (
        <SupporterWallet user={user} bills={db.bills} payments={db.payments} now={now} />
      ) : (
        <BeneficiaryWallet user={user} bills={db.bills} now={now} />
      )}
    </div>
  );
}

function TrustNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 rounded-3xl bg-cream-100 p-4 text-sm leading-relaxed text-ink-700">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/* --------------------------------------------------------- Supporter */

function SupporterWallet({ user, bills, payments, now }: { user: PublicUser; bills: Bill[]; payments: Payment[]; now: number }) {
  const mine = payments
    .filter((p) => p.userId === user.id)
    .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt));
  const confirmed = mine.filter((p) => p.status === "success");
  const thisMonth = monthKey(now);
  const monthTotal = confirmed.filter((p) => monthKey(new Date(p.confirmedAt ?? p.createdAt).getTime()) === thisMonth).reduce((s, p) => s + p.amount, 0);
  const allTime = confirmed.reduce((s, p) => s + p.amount, 0);

  // Group by month for the history list.
  const groups = new Map<string, Payment[]>();
  for (const p of mine) {
    const key = monthKey(new Date(p.confirmedAt ?? p.createdAt).getTime());
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5">
        <StatTile label={`Given in ${monthLabel(thisMonth)}`} value={formatNaira(monthTotal)} icon={CalendarDays} />
        <StatTile label="Given all-time" value={formatNaira(allTime)} icon={HandCoins} tone="light" />
      </section>

      <TrustNote>
        There&apos;s no balance to top up. Each payment goes through Paystack straight to the bill&apos;s payee — the hospital, school or
        provider. Your card details are handled by Paystack and never stored by VILLAGE.
      </TrustNote>

      <section aria-labelledby="history-heading">
        <SectionHeader id="history-heading" title="Payment history" />
        {mine.length === 0 ? (
          <div className="mt-3">
            <EmptyPanel icon={ReceiptText} title="No payments yet" text="Your receipts will appear here after you contribute to a bill." cta={{ href: "/bills", label: "Discover bills" }} />
          </div>
        ) : (
          [...groups].map(([month, list]) => (
            <div key={month} className="mt-4">
              <h3 className="mb-2 text-xs font-bold tracking-wider text-ink-500 uppercase">
                {monthLabel(month)} {month.slice(0, 4)}
              </h3>
              <ul className="divide-y divide-cream-200 rounded-3xl border border-cream-200 bg-white">
                {list.map((p) => {
                  const bill = bills.find((b) => b.id === p.billId);
                  return (
                    <li key={p.reference}>
                      <Link
                        href={`/payments/callback?reference=${encodeURIComponent(p.reference)}`}
                        className="flex items-center gap-3 p-4 transition hover:bg-cream-50"
                        aria-label={`Receipt: ${formatNaira(p.amount)} to ${bill?.title ?? "a bill"}`}
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-100 text-maroon-700">
                          {bill ? <CategoryIcon category={bill.category} className="size-5" /> : <ReceiptText className="size-5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink-900">{bill?.title ?? "Bill removed"}</span>
                          <span className="block truncate text-xs text-ink-500">
                            {formatDate(p.confirmedAt ?? p.createdAt)} · To {bill?.payee ?? "payee"}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className={`block font-bold tabular-nums ${p.status === "success" ? "text-ink-900" : "text-ink-400 line-through"}`}>
                            {formatNaira(p.amount)}
                          </span>
                          <PaymentStatusBadge status={p.status} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------- Beneficiary */

const STAGES: { id: Exclude<PayoutStage, "closed">; label: string }[] = [
  { id: "raising", label: "Raising" },
  { id: "awaiting_payout", label: "Funded" },
  { id: "paid_out", label: "Paid to payee" },
];

function BeneficiaryWallet({ user, bills, now }: { user: PublicUser; bills: Bill[]; now: number }) {
  const mine = bills.filter((b) => b.ownerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = (stage: PayoutStage) => mine.filter((b) => payoutStage(b, now) === stage).reduce((s, b) => s + b.raisedAmount, 0);

  return (
    <>
      <section className="grid grid-cols-2 gap-2.5">
        <StatTile label="Total raised" value={formatNaira(mine.reduce((s, b) => s + b.raisedAmount, 0))} icon={HandCoins} />
        <StatTile label="Paid to payees" value={formatNaira(sum("paid_out"))} icon={Landmark} tone="light" />
        <StatTile label="Awaiting payout" value={formatNaira(sum("awaiting_payout"))} icon={Clock3} tone="light" />
        <StatTile label="Still raising" value={formatNaira(sum("raising"))} icon={ReceiptText} tone="light" />
      </section>

      <TrustNote>
        Money raised is paid directly to the payee on your bill (for example the hospital or school) once it&apos;s fully funded and
        verified — never into a personal wallet. That keeps every bill honest for supporters.
      </TrustNote>

      <section aria-labelledby="payouts-heading">
        <SectionHeader id="payouts-heading" title="Payouts" />
        {mine.length === 0 ? (
          <div className="mt-3">
            <EmptyPanel icon={WalletMinimal} title="No bills yet" text="Post a bill and you'll be able to follow every naira here." cta={{ href: "/bills/new", label: "Post a bill" }} />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {mine.map((bill) => (
              <PayoutCard key={bill.id} bill={bill} stage={payoutStage(bill, now)} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function PayoutCard({ bill, stage }: { bill: Bill; stage: PayoutStage }) {
  const reached = stage === "closed" ? 0 : STAGES.findIndex((s) => s.id === stage);
  return (
    <li>
      <Link href={`/bills/${bill.id}`} className="block rounded-3xl border border-cream-200 bg-white p-4 transition hover:shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink-900">{bill.title}</span>
            <span className="block truncate text-xs text-ink-500">To {bill.payee}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-bold tabular-nums text-ink-900">{formatNaira(bill.raisedAmount)}</span>
            <span className="text-xs text-ink-500">of {formatNaira(bill.totalAmount)}</span>
          </span>
        </div>

        {stage === "closed" ? (
          <p className="mt-3 rounded-2xl bg-cream-100 p-3 text-xs text-ink-700">
            {bill.removedAt ? `Removed by the VILLAGE team${bill.removalReason ? `: ${bill.removalReason}` : "."}` : "This bill closed before it was fully funded."}
            {bill.raisedAmount > 0 && ` Our team will contact you about the ${formatNaira(bill.raisedAmount)} raised.`}
          </p>
        ) : (
          <ol className="mt-4 grid grid-cols-3 gap-1" aria-label="Payout progress">
            {STAGES.map((s, i) => {
              const done = i < reached || stage === "paid_out";
              const current = i === reached && stage !== "paid_out";
              return (
                <li key={s.id} className="flex flex-col gap-1.5" aria-current={current ? "step" : undefined}>
                  <span className={`h-1.5 rounded-full ${done ? "bg-success-600" : current ? "bg-maroon-700" : "bg-cream-200"}`} />
                  <span className={`flex items-center gap-1 text-[0.7rem] font-semibold ${done ? "text-success-600" : current ? "text-maroon-700" : "text-ink-400"}`}>
                    {done && <Check className="size-3" aria-hidden="true" />}
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {bill.completedAt && <p className="mt-2 text-xs text-ink-500">Paid on {formatDate(bill.completedAt)}</p>}
      </Link>
    </li>
  );
}
