"use client";

import Link from "next/link";
import { ArrowLeft, Check, HandHeart, ReceiptText, type LucideIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { register, type AuthFormState } from "@/app/actions/auth";
import { FormAlert, FormField, SubmitButton } from "@/components/ui/FormField";
import { ROLES, type Role } from "@/lib/roles";

const ROLE_ICONS: Record<Role, LucideIcon> = { supporter: HandHeart, beneficiary: ReceiptText };

export function RegisterForm({ next, initialRole }: { next: string | null; initialRole: Role | null }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(register, {});
  const [role, setRole] = useState<Role | null>(initialRole);
  const [step, setStep] = useState<"role" | "details">(initialRole ? "details" : "role");
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  if (step === "role") {
    return (
      <div className="animate-fade-up">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-900">How will you use VILLAGE?</legend>
          <div className="mt-3 space-y-3" role="radiogroup">
            {(Object.keys(ROLES) as Role[]).map((id) => {
              const r = ROLES[id];
              const Icon = ROLE_ICONS[id];
              const selected = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(id)}
                  className={`flex w-full items-start gap-4 rounded-3xl border-2 p-4 text-left transition active:scale-[0.99] ${
                    selected ? "border-maroon-700 bg-white shadow-card" : "border-cream-200 bg-white/60 hover:border-maroon-700/40"
                  }`}
                >
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl transition ${
                      selected ? "bg-maroon-700 text-white" : "bg-cream-100 text-maroon-700"
                    }`}
                  >
                    <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-serif text-lg font-semibold text-ink-900">{r.headline}</span>
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition ${
                          selected ? "border-maroon-700 bg-maroon-700 text-white" : "border-cream-300"
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs font-bold tracking-wider text-gold-600 uppercase">{r.label}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-ink-700">{r.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <button
          type="button"
          disabled={!role}
          onClick={() => setStep("details")}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-maroon-700 text-[1.05rem] font-semibold text-white transition hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-40"
        >
          Continue{role ? ` as a ${ROLES[role].label}` : ""}
        </button>
        <SignInLink href={loginHref} />
      </div>
    );
  }

  const isBeneficiary = role === "beneficiary";

  return (
    <div className="animate-fade-up">
      <button
        type="button"
        onClick={() => setStep("role")}
        className="mb-5 inline-flex items-center gap-2 rounded-full bg-cream-100 py-1.5 pr-3.5 pl-2.5 text-sm font-semibold text-maroon-700 hover:bg-cream-200"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {role && ROLES[role].label} account · change
      </button>

      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="role" value={role ?? ""} />
        {next && <input type="hidden" name="next" value={next} />}
        {e.role && <FormAlert>{e.role}</FormAlert>}

        <FormField label="Full name" name="fullName" autoComplete="name" placeholder="e.g. Amara Okafor" defaultValue={v.fullName} error={e.fullName} required />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          defaultValue={v.email}
          error={e.email}
          required
        />
        <FormField
          label="Phone number"
          optional={!isBeneficiary}
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0803 123 4567"
          defaultValue={v.phone}
          error={e.phone}
          hint={isBeneficiary ? "Used to verify the bills you post. Never shown publicly." : undefined}
        />
        <FormField
          label="City / State"
          optional={!isBeneficiary}
          name="location"
          autoComplete="address-level2"
          placeholder="e.g. Ikeja, Lagos"
          defaultValue={v.location}
          error={e.location}
          hint={isBeneficiary ? "Shown on your bills so supporters know where you are." : undefined}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          error={e.password}
          hint="At least 8 characters."
          required
        />

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-700">
            <input type="checkbox" name="terms" defaultChecked={v.terms === "on"} className="mt-0.5 size-4.5 shrink-0 accent-maroon-700" />
            <span>
              I agree to VILLAGE&apos;s Terms of Use and Privacy Policy
              {isBeneficiary && ", and confirm that the bills I post are genuine"}.
            </span>
          </label>
          {e.terms && <p role="alert" className="mt-1.5 text-sm font-medium text-danger-500">{e.terms}</p>}
        </div>

        <SubmitButton pending={pending} pendingLabel="Creating your account…">
          Create account
        </SubmitButton>
      </form>
      <SignInLink href={loginHref} />
    </div>
  );
}

function SignInLink({ href }: { href: string }) {
  return (
    <p className="mt-8 text-center text-sm text-ink-500">
      Already have an account?{" "}
      <Link href={href} className="font-semibold text-maroon-700 underline-offset-2 hover:underline">
        Sign in
      </Link>
    </p>
  );
}
