"use client";

import { AlertCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { postBill, type PostBillState } from "@/app/actions/bills";
import { BILL_LIMITS } from "@/lib/bill-limits";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { FormAlert, FormField, SubmitButton } from "@/components/ui/FormField";
import { CATEGORIES } from "@/lib/categories";

export function PostBillForm({ minDate, maxDate }: { minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState<PostBillState, FormData>(postBill, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [amount, setAmount] = useState(v.totalAmount ?? "");
  const [summary, setSummary] = useState(v.summary ?? "");

  return (
    <form action={action} noValidate className="space-y-6">
      {state.error && <FormAlert>{state.error}</FormAlert>}

      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">Category</legend>
        <div className="mt-2.5 grid grid-cols-3 gap-2 min-[420px]:grid-cols-5">
          {CATEGORIES.map((c) => (
            <label key={c.id} className="group cursor-pointer" title={c.description}>
              <input type="radio" name="category" value={c.id} defaultChecked={v.category === c.id} className="peer sr-only" />
              <span className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-cream-200 bg-white px-1 py-3 text-xs font-semibold text-ink-700 transition peer-checked:border-maroon-700 peer-checked:bg-maroon-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500">
                <CategoryIcon category={c.id} className="size-6" strokeWidth={1.8} />
                {c.label}
              </span>
            </label>
          ))}
        </div>
        {e.category && <Error>{e.category}</Error>}
      </fieldset>

      <FormField
        label="Bill title"
        name="title"
        placeholder="e.g. Hospital Bill – Chemotherapy"
        maxLength={BILL_LIMITS.titleMax}
        defaultValue={v.title}
        error={e.title}
      />

      <div>
        <label htmlFor="totalAmount" className="text-sm font-semibold text-ink-900">
          Total amount
        </label>
        <div
          className={`mt-2 flex h-14 items-center rounded-2xl border-2 bg-cream-50 px-4 transition focus-within:border-maroon-700 focus-within:bg-white ${
            e.totalAmount ? "border-danger-500" : "border-cream-200"
          }`}
        >
          <span className="text-xl font-bold text-ink-500">₦</span>
          <input
            id="totalAmount"
            name="totalAmount"
            inputMode="numeric"
            placeholder="0"
            value={amount ? Number(amount).toLocaleString("en-NG") : ""}
            onChange={(ev) => setAmount(ev.target.value.replace(/\D/g, "").slice(0, 8))}
            aria-invalid={Boolean(e.totalAmount)}
            className="ml-1.5 w-full bg-transparent text-xl font-bold tabular-nums text-ink-900 outline-none placeholder:text-ink-400"
          />
        </div>
        {e.totalAmount ? <Error>{e.totalAmount}</Error> : <Hint>The full amount on your invoice or quote.</Hint>}
      </div>

      <FormField
        label="Who gets paid?"
        name="payee"
        placeholder="e.g. Lagos University Teaching Hospital"
        defaultValue={v.payee}
        error={e.payee}
        hint="Money goes directly to the school, hospital or provider — not to you personally."
      />

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="summary" className="text-sm font-semibold text-ink-900">
            Short summary
          </label>
          <span className="text-xs text-ink-500 tabular-nums">
            {summary.length}/{BILL_LIMITS.summaryMax}
          </span>
        </div>
        <textarea
          id="summary"
          name="summary"
          rows={2}
          maxLength={BILL_LIMITS.summaryMax}
          value={summary}
          onChange={(ev) => setSummary(ev.target.value)}
          placeholder="One or two sentences shown on your bill card."
          aria-invalid={Boolean(e.summary)}
          className={textarea(e.summary)}
        />
        {e.summary && <Error>{e.summary}</Error>}
      </div>

      <div>
        <label htmlFor="story" className="text-sm font-semibold text-ink-900">
          Your story
        </label>
        <textarea
          id="story"
          name="story"
          rows={6}
          maxLength={BILL_LIMITS.storyMax}
          defaultValue={v.story}
          placeholder="What's the bill for, what have you covered so far, and how will this help? Leave a blank line between paragraphs."
          aria-invalid={Boolean(e.story)}
          className={textarea(e.story)}
        />
        {e.story && <Error>{e.story}</Error>}
      </div>

      <FormField
        label="Needed by"
        name="deadline"
        type="date"
        min={minDate}
        max={maxDate}
        defaultValue={v.deadline}
        error={e.deadline}
      />

      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">How can it be paid?</legend>
        <div className="mt-2.5 space-y-2">
          {[
            { value: "yes", title: "Many supporters can contribute", body: "Best for larger bills — any amount helps." },
            { value: "no", title: "One person pays it in full", body: "Best for small bills like a meter top-up." },
          ].map((o) => (
            <label key={o.value} className="block cursor-pointer">
              <input
                type="radio"
                name="allowsPartialPayments"
                value={o.value}
                defaultChecked={(v.allowsPartialPayments ?? "yes") === o.value}
                className="peer sr-only"
              />
              <span className="block rounded-2xl border-2 border-cream-200 bg-white p-4 transition peer-checked:border-maroon-700 peer-checked:shadow-soft peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500">
                <span className="block font-semibold text-ink-900">{o.title}</span>
                <span className="mt-0.5 block text-sm text-ink-500">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <SubmitButton pending={pending} pendingLabel="Posting your bill…">
        Post bill
      </SubmitButton>
      <p className="text-center text-xs leading-relaxed text-ink-500">
        New bills show as <strong>unverified</strong> until our team confirms your invoice.
      </p>
    </form>
  );
}

const textarea = (error?: string) =>
  `mt-2 w-full resize-y rounded-2xl border-2 bg-cream-50 px-4 py-3 leading-relaxed text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-maroon-700 focus:bg-white ${
    error ? "border-danger-500" : "border-cream-200"
  }`;

function Error({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-500">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-ink-500">{children}</p>;
}
