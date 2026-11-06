import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Clock3, Crown, Loader2, X } from "lucide-react";
import { AutoRefresh } from "@/components/payment/AutoRefresh";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { PaymentGatewayError } from "@/server/payments/paystack";
import { confirmPlusCheckout, type PlusConfirmation } from "@/server/payments/subscriptions";

export const metadata: Metadata = { title: "VILLAGE Plus", robots: { index: false } };

export default function PlusCallbackPage({ searchParams }: PageProps<"/plus/callback">) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-8 text-center sm:px-6">
      <Suspense
        fallback={
          <div aria-busy="true" className="pt-10">
            <Loader2 className="mx-auto size-12 animate-spin text-maroon-700" aria-hidden="true" />
            <p className="mt-4 font-serif text-2xl font-semibold text-ink-900">Confirming your subscription…</p>
          </div>
        }
      >
        <Result searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Result({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const reference = typeof sp.reference === "string" ? sp.reference : typeof sp.trxref === "string" ? sp.trxref : null;
  const user = await requireUser(reference ? `/plus/callback?reference=${encodeURIComponent(reference)}` : "/plus");
  if (!reference) return <Outcome icon={X} tone="bad" title="Missing payment reference" body="We couldn't tell which payment to check." />;

  let result: PlusConfirmation;
  try {
    result = await confirmPlusCheckout(reference, user.id);
  } catch (error) {
    const msg = error instanceof PaymentGatewayError ? error.message : "We couldn't reach Paystack.";
    return (
      <Outcome icon={Clock3} tone="wait" title="Still confirming" body={`${msg} We'll keep checking — you won't be charged twice.`}>
        <AutoRefresh />
      </Outcome>
    );
  }

  switch (result.state) {
    case "active":
      return (
        <Outcome icon={Crown} tone="good" title="Welcome to VILLAGE Plus" body={`Your extra slots are ready. Your plan renews on ${formatDate(result.periodEnd)}.`} />
      );
    case "pending":
      return (
        <Outcome icon={Clock3} tone="wait" title="Confirming your payment" body="Your bank is still processing this payment. This page updates automatically.">
          <AutoRefresh />
        </Outcome>
      );
    case "failed":
      return <Outcome icon={X} tone="bad" title="Subscription not started" body={`${result.reason} You have not been subscribed.`} />;
    case "not_found":
      return <Outcome icon={X} tone="bad" title="Payment not found" body="We have no record of this subscription payment on your account." />;
  }
}

function Outcome({
  icon: Icon,
  tone,
  title,
  body,
  children,
}: {
  icon: typeof Crown;
  tone: "good" | "wait" | "bad";
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const ring = { good: "bg-gold-100 text-gold-600", wait: "bg-gold-100 text-gold-600", bad: "bg-maroon-100 text-maroon-700" }[tone];
  return (
    <div className="flex w-full flex-1 flex-col items-center">
      <span className={`grid size-24 animate-pop place-items-center rounded-full ${ring}`}>
        <Icon className="size-11" strokeWidth={2} aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-serif text-[1.9rem] leading-tight font-semibold text-ink-900">{title}</h1>
      <p className="mt-2 max-w-sm text-ink-700">{body}</p>
      {children}
      <div className="mt-auto flex w-full flex-col gap-2.5 pt-10">
        <Link href={tone === "bad" ? "/plus" : "/bills/new"} className="flex h-14 items-center justify-center rounded-2xl bg-maroon-700 font-semibold text-white hover:bg-maroon-800">
          {tone === "bad" ? "Back to Plus" : "Use my new slots"}
        </Link>
        <Link href="/home" className="flex h-14 items-center justify-center rounded-2xl border border-maroon-700/30 font-semibold text-maroon-700 hover:bg-cream-100">
          Go home
        </Link>
      </div>
    </div>
  );
}
