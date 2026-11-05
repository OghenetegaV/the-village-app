import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Check, Clock3, Loader2, PartyPopper, X } from "lucide-react";
import { AutoRefresh } from "@/components/payment/AutoRefresh";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percentFunded, remainingAmount } from "@/lib/bills";
import { formatDate, formatNaira } from "@/lib/format";
import type { Bill, Payment } from "@/lib/types";
import { PaymentGatewayError } from "@/server/payments/paystack";
import { confirmPayment, type ConfirmationResult } from "@/server/payments/service";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Payment status", robots: { index: false } };

export default function PaymentCallbackPage({ searchParams }: PageProps<"/payments/callback">) {
  return (
    <main className="flex min-h-dvh flex-col px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 sm:px-6">
      <Suspense fallback={<Confirming />}>
        <PaymentResult searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function PaymentResult({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const reference = first(sp.reference) ?? first(sp.trxref);

  if (!reference) {
    return <Outcome tone="failed" title="Missing payment reference" body="We couldn't tell which payment to check." />;
  }

  let result: ConfirmationResult;
  try {
    result = await confirmPayment(reference);
  } catch (error) {
    const message = error instanceof PaymentGatewayError ? error.message : "We couldn't reach the payment provider.";
    return (
      <Outcome tone="pending" title="Still confirming your payment" body={`${message} We'll keep checking — you won't be charged twice.`}>
        <AutoRefresh />
      </Outcome>
    );
  }

  // Receipts contain the payer's email: only the account that made the payment may view them.
  // (Confirmation and crediting above still run, so the bill is updated either way.)
  if (result.state !== "not_found" && result.payment.userId) {
    const viewer = await getCurrentUser();
    if (viewer?.id !== result.payment.userId) {
      return (
        <Outcome
          tone="pending"
          title={viewer ? "This receipt belongs to another account" : "Sign in to view this receipt"}
          body={viewer ? "Switch to the account that made this payment to see its details." : "Receipts are private to the person who paid."}
        >
          {!viewer && (
            <Link
              href={`/login?next=${encodeURIComponent(`/payments/callback?reference=${reference}`)}`}
              className="mt-6 flex h-13 w-full items-center justify-center rounded-2xl bg-maroon-700 font-semibold text-white hover:bg-maroon-800"
            >
              Sign in
            </Link>
          )}
        </Outcome>
      );
    }
  }

  switch (result.state) {
    case "not_found":
      return <Outcome tone="failed" title="Payment not found" body="We have no record of this payment reference." />;
    case "pending":
      return (
        <Outcome
          tone="pending"
          title="Confirming your payment"
          body="Your bank is still processing this payment. This page will update automatically once it's confirmed."
          payment={result.payment}
          bill={result.bill}
        >
          <AutoRefresh />
        </Outcome>
      );
    case "failed":
      return (
        <Outcome tone="failed" title="Payment not completed" body={result.reason} payment={result.payment} bill={result.bill} retry />
      );
    case "success":
      return <Success payment={result.payment} bill={result.bill} />;
  }
}

function Success({ payment, bill }: { payment: Payment; bill: Bill }) {
  const pct = percentFunded(bill);
  const remaining = remainingAmount(bill);
  const completedIt = remaining === 0;
  const firstName = bill.owner.name.split(" ")[0];

  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <span className="grid size-24 animate-pop place-items-center rounded-full bg-success-100">
        <span className="grid size-16 place-items-center rounded-full bg-success-600 text-white shadow-card">
          <Check className="size-9" strokeWidth={3} aria-hidden="true" />
        </span>
      </span>
      <h1 className="mt-6 animate-fade-up font-serif text-[2rem] leading-tight font-semibold text-ink-900">
        Thank you{payment.displayName ? `, ${payment.displayName.split(" ")[0]}` : ""}!
      </h1>
      <p className="mt-2 max-w-sm animate-fade-up text-ink-700">
        Your payment of <strong className="text-ink-900">{formatNaira(payment.amount)}</strong> towards {firstName}&apos;s{" "}
        <strong className="text-ink-900">{bill.title}</strong> has been confirmed.
      </p>

      {completedIt && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-2 text-sm font-semibold text-ink-900">
          <PartyPopper className="size-4 text-gold-600" aria-hidden="true" />
          This bill is now fully funded!
        </p>
      )}

      <section aria-label="Updated bill progress" className="mt-7 w-full animate-fade-up rounded-3xl border border-cream-200 bg-white p-5 text-left shadow-card">
        <p className="text-sm font-semibold text-ink-500">Updated progress</p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-2xl font-extrabold tracking-tight tabular-nums text-ink-900">{formatNaira(bill.raisedAmount)}</p>
          <p className="text-sm text-ink-500">of {formatNaira(bill.totalAmount)}</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar percent={pct} complete={completedIt} label={`${pct}% funded`} />
          <span className="shrink-0 text-xs font-semibold text-ink-700">{pct}%</span>
        </div>
        <p className="mt-3 text-sm text-ink-700">
          {completedIt ? "Nothing left to pay." : `${formatNaira(remaining)} remaining`}
        </p>
        <Receipt payment={payment} />
      </section>

      <Actions billId={bill.id} />
    </div>
  );
}

function Outcome({
  tone,
  title,
  body,
  payment,
  bill,
  retry,
  children,
}: {
  tone: "pending" | "failed";
  title: string;
  body: string;
  payment?: Payment;
  bill?: Bill;
  retry?: boolean;
  children?: React.ReactNode;
}) {
  const Icon = tone === "pending" ? Clock3 : X;
  return (
    <div className="flex flex-1 flex-col items-center text-center">
      <span
        className={`grid size-20 animate-pop place-items-center rounded-full ${
          tone === "pending" ? "bg-gold-100 text-gold-600" : "bg-maroon-100 text-maroon-700"
        }`}
      >
        <Icon className="size-9" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-serif text-[1.75rem] leading-tight font-semibold text-ink-900">{title}</h1>
      <p className="mt-2 max-w-sm text-ink-700">{body}</p>
      {bill && (
        <p className="mt-1 text-sm text-ink-500">
          Bill progress has not changed{tone === "pending" ? " yet" : ""} — nothing is credited until payment is confirmed.
        </p>
      )}
      {payment && (
        <div className="mt-6 w-full rounded-3xl border border-cream-200 bg-white p-5 text-left">
          <p className="text-sm text-ink-500">Amount</p>
          <p className="text-xl font-bold text-ink-900">{formatNaira(payment.amount)}</p>
          <Receipt payment={payment} />
        </div>
      )}
      {children}
      <Actions billId={bill?.id} retry={retry} />
    </div>
  );
}

function Receipt({ payment }: { payment: Payment }) {
  return (
    <dl className="mt-4 space-y-1.5 border-t border-dashed border-cream-300 pt-4 text-xs">
      <div className="flex justify-between gap-3">
        <dt className="text-ink-500">Reference</dt>
        <dd className="font-mono font-semibold break-all text-ink-900">{payment.reference}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-500">Date</dt>
        <dd className="font-semibold text-ink-900">{formatDate(payment.confirmedAt ?? payment.createdAt)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-ink-500">{payment.status === "success" ? "Receipt sent to" : "Email"}</dt>
        <dd className="font-semibold break-all text-ink-900">{payment.email}</dd>
      </div>
    </dl>
  );
}

function Actions({ billId, retry }: { billId?: string; retry?: boolean }) {
  return (
    <div className="mt-auto flex w-full flex-col gap-2.5 pt-8">
      {billId && (
        <Link
          href={retry ? `/bills/${billId}#contribute` : `/bills/${billId}`}
          className="flex h-14 items-center justify-center rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800"
        >
          {retry ? "Try again" : "View bill"}
        </Link>
      )}
      <Link
        href="/bills"
        className={`flex h-14 items-center justify-center rounded-2xl font-semibold transition ${
          billId ? "border border-maroon-700/30 text-maroon-700 hover:bg-cream-100" : "bg-maroon-700 text-white hover:bg-maroon-800"
        }`}
      >
        Discover more bills
      </Link>
    </div>
  );
}

function Confirming() {
  return (
    <div className="flex flex-1 flex-col items-center pt-16 text-center" aria-busy="true">
      <Loader2 className="size-12 animate-spin text-maroon-700" aria-hidden="true" />
      <h1 className="mt-6 font-serif text-2xl font-semibold text-ink-900">Confirming your payment…</h1>
      <p className="mt-2 text-ink-500">Checking with Paystack. Please don&apos;t close this page.</p>
    </div>
  );
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
