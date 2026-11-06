"use client";

import { AlertCircle, Crown, LockKeyhole } from "lucide-react";
import { useActionState } from "react";
import { cancelPlusAction, subscribePlus, type PlusFormState } from "@/app/actions/plus";

export function SubscribeButton({ priceLabel }: { priceLabel: string }) {
  const [state, action, pending] = useActionState<PlusFormState>(subscribePlus, {});
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gold-500 text-[1.05rem] font-semibold text-white shadow-card transition hover:bg-gold-600 disabled:opacity-70"
      >
        <Crown className="size-5" aria-hidden="true" />
        {pending ? "Opening secure checkout…" : `Subscribe · ${priceLabel}`}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/70">
        <LockKeyhole className="size-3.5" aria-hidden="true" /> Billed by Paystack. Cancel anytime.
      </p>
      {state.error && (
        <p role="alert" className="mt-3 flex gap-2 rounded-xl bg-white/10 p-3 text-sm text-white">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {state.error}
        </p>
      )}
    </form>
  );
}

export function CancelButton() {
  const [state, action, pending] = useActionState<PlusFormState>(cancelPlusAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Cancel VILLAGE Plus? You'll keep your Plus slots until the end of the period you've paid for.")) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className="text-sm font-semibold text-maroon-700 hover:underline disabled:opacity-60">
        {pending ? "Cancelling…" : "Cancel subscription"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm font-medium text-danger-500">{state.error}</p>}
      {state.message && <p role="status" className="mt-2 text-sm font-medium text-success-600">{state.message}</p>}
    </form>
  );
}
