"use client";

import { AlertCircle, BadgeCheck, Banknote, Trash2 } from "lucide-react";
import { useActionState } from "react";
import { recordPayoutAction, removeBillAction, verifyBillAction, type AdminFormState } from "@/app/actions/admin";
import { formatNaira } from "@/lib/format";

function Feedback({ state }: { state: AdminFormState }) {
  if (state.error)
    return (
      <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger-500">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="mt-2 text-sm font-medium text-success-600">
        {state.message}
      </p>
    );
  return null;
}

const primary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-maroon-700 px-4 text-sm font-semibold text-white transition hover:bg-maroon-800 disabled:opacity-60";

export function VerifyBillForm({ billId }: { billId: string }) {
  const [state, action, pending] = useActionState(verifyBillAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="billId" value={billId} />
      <button type="submit" disabled={pending} className={`${primary} w-full`}>
        <BadgeCheck className="size-4" aria-hidden="true" />
        {pending ? "Verifying…" : "Verify bill"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function RemoveBillForm({ billId }: { billId: string }) {
  const [state, action, pending] = useActionState(removeBillAction, {});
  return (
    <details className="group rounded-xl border border-cream-200">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-2 text-sm font-semibold text-maroon-700 [&::-webkit-details-marker]:hidden">
        <Trash2 className="size-4" aria-hidden="true" /> Remove…
      </summary>
      <form action={action} className="border-t border-cream-200 p-3">
        <input type="hidden" name="billId" value={billId} />
        <label htmlFor={`reason-${billId}`} className="text-xs font-semibold text-ink-900">
          Reason (shown to the owner)
        </label>
        <textarea
          id={`reason-${billId}`}
          name="reason"
          required
          minLength={10}
          maxLength={300}
          rows={3}
          placeholder="e.g. The invoice couldn't be confirmed with the hospital."
          className="mt-1.5 w-full rounded-xl border-2 border-cream-200 bg-cream-50 p-2.5 text-sm outline-none focus:border-maroon-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border border-maroon-700 text-sm font-semibold text-maroon-700 hover:bg-maroon-100 disabled:opacity-60"
        >
          {pending ? "Removing…" : "Remove from feed"}
        </button>
        <Feedback state={state} />
      </form>
    </details>
  );
}

export function PayoutForm({ billId, amount, payee }: { billId: string; amount: number; payee: string }) {
  const [state, action, pending] = useActionState(recordPayoutAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Confirm that ${formatNaira(amount)} has been transferred to ${payee}? This can't be undone.`)) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="billId" value={billId} />
      <label htmlFor={`ref-${billId}`} className="text-xs font-semibold text-ink-900">
        Transfer reference
      </label>
      <input
        id={`ref-${billId}`}
        name="reference"
        required
        minLength={6}
        maxLength={64}
        autoComplete="off"
        placeholder="e.g. TRF/2026/118734"
        className="h-11 w-full rounded-xl border-2 border-cream-200 bg-cream-50 px-3 font-mono text-sm outline-none focus:border-maroon-700"
      />
      <button type="submit" disabled={pending} className={`${primary} w-full`}>
        <Banknote className="size-4" aria-hidden="true" />
        {pending ? "Recording…" : `Record ${formatNaira(amount)} payout`}
      </button>
      <Feedback state={state} />
    </form>
  );
}
