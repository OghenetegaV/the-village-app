"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/actions/auth";
import { FormAlert, FormField, SubmitButton } from "@/components/ui/FormField";

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <>
      <form action={action} className="space-y-5" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && <FormAlert>{state.error}</FormAlert>}
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
        />
        <FormField label="Password" name="password" type="password" autoComplete="current-password" required />
        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-ink-500">
        New to VILLAGE?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-semibold text-maroon-700 underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
