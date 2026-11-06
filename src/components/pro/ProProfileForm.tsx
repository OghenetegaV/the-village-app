"use client";

import { AlertCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { saveProProfile, type ProFormState } from "@/app/actions/pros";
import { FormField, SubmitButton } from "@/components/ui/FormField";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import { TRADES, type TradeId } from "@/lib/trades";
import type { ProProfile } from "@/lib/types";
import { TradeIcon } from "./ProBits";

export function ProProfileForm({ existing }: { existing: ProProfile | null }) {
  const [state, action, pending] = useActionState<ProFormState, FormData>(saveProProfile, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [trade, setTrade] = useState<TradeId | "">((v.trade as TradeId) || existing?.trade || "");
  const hint = TRADES.find((t) => t.id === trade);

  return (
    <form action={action} noValidate className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">Your trade</legend>
        <p className="mt-0.5 text-xs text-ink-500">This decides which room you join.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
          {TRADES.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input
                type="radio"
                name="trade"
                value={t.id}
                checked={trade === t.id}
                onChange={() => setTrade(t.id)}
                className="peer sr-only"
              />
              <span className="flex h-full items-center gap-2 rounded-2xl border-2 border-cream-200 bg-white px-3 py-2.5 text-xs font-semibold text-ink-700 transition peer-checked:border-maroon-700 peer-checked:bg-maroon-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500">
                <TradeIcon trade={t.id} className="size-4 shrink-0" strokeWidth={1.8} />
                {t.label}
              </span>
            </label>
          ))}
        </div>
        {e.trade && <Err>{e.trade}</Err>}
        {existing && trade && trade !== existing.trade && (
          <p className="mt-2 rounded-xl bg-gold-100 p-2.5 text-xs text-ink-700">
            Changing your trade moves you to a different room. Your past messages stay in the old one.
          </p>
        )}
      </fieldset>

      <FormField
        label="Headline"
        name="headline"
        maxLength={80}
        placeholder="e.g. Residential wiring & solar installs"
        defaultValue={v.headline ?? existing?.headline}
        error={e.headline}
        hint="Shown next to your name in the room."
      />

      <div>
        <label htmlFor="state" className="text-sm font-semibold text-ink-900">
          State you work in
        </label>
        <select
          id="state"
          name="state"
          defaultValue={v.state ?? existing?.state ?? ""}
          className={`mt-2 h-13 w-full rounded-2xl border-2 bg-cream-50 px-4 text-ink-900 outline-none focus:border-maroon-700 ${
            e.state ? "border-danger-500" : "border-cream-200"
          }`}
        >
          <option value="" disabled>
            Choose a state
          </option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {e.state && <Err>{e.state}</Err>}
      </div>

      <FormField
        label="Years of experience"
        name="yearsExperience"
        type="number"
        inputMode="numeric"
        min={0}
        max={60}
        defaultValue={v.yearsExperience ?? existing?.yearsExperience?.toString()}
        error={e.yearsExperience}
      />

      <FormField
        label="Licence / registration number"
        optional
        name="licenseNumber"
        maxLength={40}
        placeholder={hint && "licenseHint" in hint ? hint.licenseHint : "If your trade has one"}
        defaultValue={v.licenseNumber ?? existing?.licenseNumber ?? ""}
        error={e.licenseNumber}
        hint="Colleagues see “licence on file”, never the number itself."
      />

      <SubmitButton pending={pending} pendingLabel="Saving…">
        {existing ? "Save profile" : "Join my trade's room"}
      </SubmitButton>
    </form>
  );
}

function Err({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-500">
      <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
