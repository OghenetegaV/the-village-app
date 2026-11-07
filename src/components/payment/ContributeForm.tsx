"use client";

import { AlertCircle, Heart, Loader2, LockKeyhole, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { beginContribution } from "@/app/actions/contribute";
import { MIN_CONTRIBUTION, remainingAmount, validateContribution } from "@/lib/bills";
import { formatNaira } from "@/lib/format";
import type { Bill } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

const QUICK_AMOUNTS = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000];

export function ContributeForm({
  bill,
  now,
  paymentsEnabled,
  viewer,
}: {
  bill: Bill;
  now: number;
  paymentsEnabled: boolean;
  viewer: { fullName: string; email: string };
}) {
  const remaining = remainingAmount(bill);
  const partial = bill.allowsPartialPayments;

  const [amountText, setAmountText] = useState(partial ? "" : String(remaining));
  const [anonymous, setAnonymous] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const amount = Number(amountText || 0);
  const quickAmounts = useMemo(() => QUICK_AMOUNTS.filter((a) => a < remaining).slice(0, 3), [remaining]);
  const firstName = bill.owner.name.split(" ")[0];

  // Restore the form after using the browser back button from the payment page.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setRedirecting(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function review(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    const amountError = validateContribution(bill, amount, now);
    if (amountError) next.amount = amountError;
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length === 0) dialogRef.current?.showModal();
  }

  function pay() {
    setServerError(null);
    startTransition(async () => {
      const result = await beginContribution({
        billId: bill.id,
        amount,
        anonymous,
      });
      if (result.ok) {
        setRedirecting(true);
        window.location.assign(result.authorizationUrl);
      } else {
        setServerError(result.error);
      }
    });
  }

  const busy = isPending || redirecting;

  return (
    <div className="rounded-3xl border border-cream-200 bg-white p-5 shadow-card">
      <h2 id="contribute-heading" className="font-serif text-xl font-semibold text-ink-900">
        {partial ? `Contribute to ${firstName}'s bill` : `Pay ${firstName}'s bill`}
      </h2>
      <p className="mt-1 text-sm text-ink-500">
        {partial ? `${formatNaira(remaining)} still needed.` : "This bill is settled with one full payment."}
      </p>

      {!paymentsEnabled && (
        <p role="alert" className="mt-4 flex gap-2 rounded-2xl bg-gold-100 p-3 text-sm text-ink-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
          Payments aren&apos;t switched on for this site yet, so checkout is unavailable. No money will be taken.
        </p>
      )}

      <form onSubmit={review} noValidate className="mt-5 space-y-5">
        {partial ? (
          <div>
            <label htmlFor="amount" className="text-sm font-semibold text-ink-900">
              Amount
            </label>
            <div
              className={`mt-2 flex h-16 items-center rounded-2xl border-2 bg-cream-50 px-4 transition focus-within:border-maroon-700 focus-within:bg-white ${
                errors.amount ? "border-danger-500" : "border-cream-200"
              }`}
            >
              <span className="text-2xl font-bold text-ink-500">₦</span>
              <input
                id="amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={amount ? amount.toLocaleString("en-NG") : ""}
                onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 9))}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby="amount-hint amount-error"
                className="ml-1.5 w-full bg-transparent text-2xl font-bold tracking-tight tabular-nums text-ink-900 outline-none placeholder:text-ink-400"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
              {quickAmounts.map((a) => (
                <Chip key={a} active={amount === a} onClick={() => setAmountText(String(a))}>
                  {formatNaira(a)}
                </Chip>
              ))}
              <Chip active={amount === remaining} onClick={() => setAmountText(String(remaining))}>
                Pay remaining {formatNaira(remaining)}
              </Chip>
            </div>
            <p id="amount-hint" className="mt-2 text-xs text-ink-500">
              Minimum {formatNaira(Math.min(MIN_CONTRIBUTION, remaining))} · Maximum {formatNaira(remaining)}
            </p>
            {errors.amount && <FieldError id="amount-error">{errors.amount}</FieldError>}
          </div>
        ) : (
          <div className="rounded-2xl bg-cream-50 p-4">
            <p className="text-sm text-ink-500">Amount payable</p>
            <p className="text-[1.75rem] font-extrabold tracking-tight tabular-nums text-ink-900">{formatNaira(remaining)}</p>
          </div>
        )}

        <div className="rounded-2xl bg-cream-50 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={viewer.fullName} size={40} />
            <div className="min-w-0">
              <p className="text-xs text-ink-500">{partial ? "Contributing as" : "Paying as"}</p>
              <p className="truncate font-semibold text-ink-900">{anonymous ? "Anonymous supporter" : viewer.fullName}</p>
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="size-4.5 accent-maroon-700"
            />
            Hide my name from {firstName}
          </label>
          <p className="mt-2 text-xs text-ink-500">Your receipt will be sent to {viewer.email}.</p>
        </div>

        <button
          type="submit"
          disabled={!paymentsEnabled}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-maroon-700 text-[1.05rem] font-semibold text-white shadow-[0_10px_24px_-12px_rgb(110_34_29/0.9)] transition hover:bg-maroon-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Heart className="size-5" aria-hidden="true" />
          {amount > 0 ? `Review ${formatNaira(amount)}` : "Continue"}
        </button>
      </form>

      {/* Review & confirm */}
      <dialog
        ref={dialogRef}
        aria-labelledby="review-title"
        onClose={() => setServerError(null)}
        onCancel={(e) => busy && e.preventDefault()}
        className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-ink-900/50 backdrop:backdrop-blur-[2px] open:animate-sheet-up sm:m-auto sm:max-w-[480px]"
      >
        <div className="mx-auto w-full max-w-[520px] rounded-t-[1.75rem] bg-white px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-[1.75rem]">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-cream-300 sm:hidden" aria-hidden="true" />
          <div className="mt-3 flex items-start justify-between">
            <h2 id="review-title" className="font-serif text-xl font-semibold text-ink-900">
              Confirm your {partial ? "contribution" : "payment"}
            </h2>
            <button
              type="button"
              aria-label="Close"
              disabled={busy}
              onClick={() => dialogRef.current?.close()}
              className="grid size-9 place-items-center rounded-full text-ink-500 hover:bg-cream-100 disabled:opacity-40"
            >
              <X className="size-5" />
            </button>
          </div>

          <dl className="mt-4 divide-y divide-cream-200 rounded-2xl bg-cream-50 px-4 text-sm">
            <Row label="Bill">{bill.title}</Row>
            <Row label="For">{bill.owner.name}</Row>
            <Row label="Paid to">{bill.payee}</Row>
            <Row label="From">{anonymous ? "Anonymous" : viewer.fullName}</Row>
            <Row label="Receipt to">{viewer.email}</Row>
          </dl>

          <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-maroon-700/15 px-4 py-3.5">
            <span className="font-semibold text-ink-700">Amount payable</span>
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-maroon-700">{formatNaira(amount)}</span>
          </div>
          {partial && (
            <p className="mt-2 text-xs text-ink-500">
              After this, {formatNaira(Math.max(0, remaining - amount))} will remain on this bill.
            </p>
          )}

          {serverError && (
            <p role="alert" className="mt-4 flex gap-2 rounded-2xl bg-maroon-100 p-3 text-sm text-maroon-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {serverError}
            </p>
          )}

          <button
            type="button"
            onClick={pay}
            disabled={busy}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-maroon-700 text-[1.05rem] font-semibold text-white transition hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                {redirecting ? "Opening secure checkout…" : "Preparing payment…"}
              </>
            ) : (
              <>
                <LockKeyhole className="size-5" aria-hidden="true" />
                Pay {formatNaira(amount)} securely
              </>
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => dialogRef.current?.close()}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-maroon-700 hover:bg-cream-100 disabled:opacity-40"
          >
            <Pencil className="size-4" aria-hidden="true" /> Edit details
          </button>

          <p className="mt-3 text-center text-xs text-ink-500">
            <LockKeyhole className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
            Secured by Paystack. Card, bank transfer and USSD accepted.
          </p>
        </div>
      </dialog>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${
        active ? "border-maroon-700 bg-maroon-700 text-white" : "border-cream-300 bg-white text-ink-700 hover:border-maroon-700/50"
      }`}
    >
      {children}
    </button>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger-500">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="text-right font-semibold break-words text-ink-900">{children}</dd>
    </div>
  );
}
