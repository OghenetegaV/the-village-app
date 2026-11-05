"use client";

import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

const inputBase =
  "h-13 w-full rounded-2xl border-2 bg-cream-50 px-4 text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-maroon-700 focus:bg-white";

export function FormField({
  label,
  optional,
  hint,
  error,
  className = "",
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = input.type === "password";

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-900">
        {label} {optional && <span className="font-normal text-ink-500">(optional)</span>}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          {...input}
          type={isPassword && reveal ? "text" : input.type}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-hint ${id}-error`}
          className={`${inputBase} ${isPassword ? "pr-12" : ""} ${error ? "border-danger-500" : "border-cream-200"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-500 hover:bg-cream-100"
          >
            {reveal ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-500">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex gap-2 rounded-2xl bg-maroon-100 p-3 text-sm text-maroon-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: React.ReactNode; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-maroon-700 text-[1.05rem] font-semibold text-white shadow-[0_10px_24px_-12px_rgb(110_34_29/0.9)] transition hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-70"
    >
      {pending ? (
        <>
          <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
