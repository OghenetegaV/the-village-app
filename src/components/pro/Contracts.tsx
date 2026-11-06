"use client";

import { AlertCircle, BadgeCheck, Briefcase, CalendarDays, Check, Crown, Mail, MapPin, Phone, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { awardAction, closeAction, interestAction, postContractAction, withdrawAction, type ProFormState } from "@/app/actions/pros";
import { Avatar } from "@/components/ui/Avatar";
import { FormField } from "@/components/ui/FormField";
import { formatDate, formatNaira } from "@/lib/format";
import { NIGERIAN_STATES } from "@/lib/nigeria";
import type { ContractView } from "@/server/pros";
import { PlusBadge } from "./ProBits";

function Feedback({ state }: { state: ProFormState }) {
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

/* ----------------------------------------------------------- Post form */

export function PostContractForm({
  trade,
  defaultState,
  quota,
}: {
  trade: string;
  defaultState: string;
  quota: { used: number; limit: number; allowed: boolean; reason: string | null; nextSlotAt: string | null; plan: string; isPlus: boolean };
}) {
  const [state, action, pending] = useActionState<ProFormState, FormData>(postContractAction, {});
  const [open, setOpen] = useState(false);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [budget, setBudget] = useState("");

  const usage = (
    <p className="text-xs text-ink-500">
      {quota.used} of {quota.limit} contract posts used this week on {quota.plan}
      {quota.nextSlotAt && ` · next slot ${formatDate(quota.nextSlotAt)}`}
    </p>
  );

  if (!quota.allowed) {
    return (
      <div className="rounded-3xl border border-cream-200 bg-white p-4">
        <p className="text-sm font-semibold text-ink-900">{quota.reason}</p>
        {usage}
        {!quota.isPlus && (
          <Link href="/plus" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600">
            <Crown className="size-4" aria-hidden="true" /> Get more slots with Plus
          </Link>
        )}
      </div>
    );
  }

  if (!open && !state.fieldErrors && !state.error) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800"
        >
          <Plus className="size-5" aria-hidden="true" /> Offer a contract
        </button>
        <div className="mt-1.5 text-center">{usage}</div>
        {state.message && <Feedback state={state} />}
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4 rounded-3xl border border-cream-200 bg-white p-5 shadow-soft">
      <input type="hidden" name="trade" value={trade} />
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-semibold text-ink-900">Offer a contract</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-ink-500 hover:text-ink-900">
          Cancel
        </button>
      </div>
      {usage}
      <FormField label="Job title" name="title" maxLength={80} placeholder="e.g. Rewire 3-bedroom flat in Lekki" defaultValue={v.title} error={e.title} />
      <div>
        <label htmlFor="c-desc" className="text-sm font-semibold text-ink-900">
          Details
        </label>
        <textarea
          id="c-desc"
          name="description"
          rows={4}
          maxLength={1500}
          defaultValue={v.description}
          placeholder="Scope, materials, timeline, and anything a colleague needs to know before applying."
          className={`mt-2 w-full rounded-2xl border-2 bg-cream-50 px-4 py-3 text-ink-900 outline-none placeholder:text-ink-400 focus:border-maroon-700 ${e.description ? "border-danger-500" : "border-cream-200"}`}
        />
        {e.description && <p className="mt-1.5 text-sm font-medium text-danger-500">{e.description}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="c-state" className="text-sm font-semibold text-ink-900">
            Location
          </label>
          <select
            id="c-state"
            name="state"
            defaultValue={v.state ?? defaultState}
            className="mt-2 h-13 w-full rounded-2xl border-2 border-cream-200 bg-cream-50 px-3 text-ink-900 outline-none focus:border-maroon-700"
          >
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <FormField label="Start by" optional name="startBy" type="date" defaultValue={v.startBy} error={e.startBy} />
      </div>
      <div>
        <label htmlFor="c-budget" className="text-sm font-semibold text-ink-900">
          Budget <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <div className="mt-2 flex h-13 items-center rounded-2xl border-2 border-cream-200 bg-cream-50 px-4 focus-within:border-maroon-700">
          <span className="font-bold text-ink-500">₦</span>
          <input
            id="c-budget"
            name="budget"
            inputMode="numeric"
            placeholder="Open to quotes"
            value={budget ? Number(budget).toLocaleString("en-NG") : ""}
            onChange={(ev) => setBudget(ev.target.value.replace(/\D/g, "").slice(0, 9))}
            className="ml-1.5 w-full bg-transparent font-semibold tabular-nums text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
          />
        </div>
        {e.budget && <p className="mt-1.5 text-sm font-medium text-danger-500">{e.budget}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex h-13 w-full items-center justify-center rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800 disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post contract"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

/* ---------------------------------------------------------------- Card */

const STATUS = {
  open: { label: "Open", className: "bg-success-100 text-success-600" },
  awarded: { label: "Awarded", className: "bg-gold-100 text-gold-600" },
  closed: { label: "Closed", className: "bg-cream-200 text-ink-500" },
} as const;

export function ContractCard({ c }: { c: ContractView }) {
  return (
    <article className={`rounded-3xl border border-cream-200 bg-white p-5 ${c.status === "open" ? "shadow-soft" : "opacity-80"}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg leading-snug font-semibold text-ink-900">{c.title}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${STATUS[c.status].className}`}>{STATUS[c.status].label}</span>
      </div>
      <p className="mt-1 text-lg font-extrabold tracking-tight text-ink-900 tabular-nums">{c.budget ? formatNaira(c.budget) : <span className="text-base font-semibold text-ink-500">Open to quotes</span>}</p>
      <p className="mt-2 line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-ink-700">{c.description}</p>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
        <div className="flex items-center gap-1">
          <MapPin className="size-3.5 text-gold-600" aria-hidden="true" />
          <dt className="sr-only">Location</dt>
          <dd>{c.state}</dd>
        </div>
        {c.startBy && (
          <div className="flex items-center gap-1">
            <CalendarDays className="size-3.5 text-gold-600" aria-hidden="true" />
            <dt className="sr-only">Start by</dt>
            <dd>Start by {formatDate(c.startBy)}</dd>
          </div>
        )}
        <div className="flex items-center gap-1">
          <UsersRound className="size-3.5 text-gold-600" aria-hidden="true" />
          <dt className="sr-only">Applicants</dt>
          <dd>
            {c.applicantCount} interested
          </dd>
        </div>
      </dl>

      {c.poster && !c.viewerIsPoster && (
        <div className="mt-4 flex items-center gap-2.5 border-t border-cream-200 pt-3">
          <Avatar name={c.poster.name} size={32} />
          <p className="min-w-0 text-xs text-ink-500">
            <span className="flex items-center gap-1 font-semibold text-ink-900">
              {c.poster.name} {c.poster.plus && <PlusBadge />}
              {c.poster.hasLicense && <BadgeCheck className="size-3.5 fill-gold-500 text-white" aria-label="Licence on file" />}
            </span>
            <span className="block truncate">
              {c.poster.headline} · {c.poster.yearsExperience} yrs
            </span>
          </p>
        </div>
      )}

      <div className="mt-4">
        {c.viewerIsPoster ? <PosterPanel c={c} /> : <ApplicantPanel c={c} />}
      </div>
    </article>
  );
}

function ApplicantPanel({ c }: { c: ContractView }) {
  const [state, action, pending] = useActionState<ProFormState, FormData>(interestAction, {});
  const [wState, withdraw, withdrawing] = useActionState<ProFormState, FormData>(withdrawAction, {});

  if (c.viewerIsAwardee && c.posterContact) {
    return (
      <div className="rounded-2xl bg-success-100 p-4 text-sm">
        <p className="flex items-center gap-1.5 font-semibold text-success-600">
          <Check className="size-4" aria-hidden="true" /> You were awarded this contract
        </p>
        <p className="mt-1 text-ink-700">Contact {c.poster?.name.split(" ")[0] ?? "the poster"} to agree the details:</p>
        <p className="mt-2 flex flex-col gap-1">
          <a href={`mailto:${c.posterContact.email}`} className="inline-flex items-center gap-1.5 font-semibold text-maroon-700">
            <Mail className="size-4" aria-hidden="true" /> {c.posterContact.email}
          </a>
          {c.posterContact.phone && (
            <a href={`tel:${c.posterContact.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-maroon-700">
              <Phone className="size-4" aria-hidden="true" /> {c.posterContact.phone}
            </a>
          )}
        </p>
      </div>
    );
  }
  if (c.status !== "open") {
    return <p className="text-sm text-ink-500">{c.status === "awarded" ? `Awarded to ${c.awardedToName ?? "a colleague"}.` : "No longer accepting applications."}</p>;
  }
  if (c.viewerHasApplied) {
    return (
      <form action={withdraw} className="flex items-center justify-between gap-3 rounded-2xl bg-cream-100 p-3">
        <input type="hidden" name="contractId" value={c.id} />
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <Check className="size-4 text-success-600" aria-hidden="true" /> You&apos;re interested
        </p>
        <button type="submit" disabled={withdrawing} className="text-sm font-semibold text-maroon-700 hover:underline disabled:opacity-60">
          Withdraw
        </button>
        <Feedback state={wState} />
      </form>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="contractId" value={c.id} />
      <label htmlFor={`note-${c.id}`} className="sr-only">
        Note to the poster
      </label>
      <input
        id={`note-${c.id}`}
        name="note"
        maxLength={300}
        placeholder="Short note — availability, similar jobs done… (optional)"
        className="h-11 w-full rounded-xl border-2 border-cream-200 bg-cream-50 px-3 text-sm outline-none focus:border-maroon-700"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-maroon-700 text-sm font-semibold text-white hover:bg-maroon-800 disabled:opacity-60"
      >
        <Briefcase className="size-4" aria-hidden="true" /> {pending ? "Sending…" : "I'm interested"}
      </button>
      <p className="text-center text-[0.7rem] text-ink-400">Your email and phone are shared with the poster only.</p>
      <Feedback state={state} />
    </form>
  );
}

function PosterPanel({ c }: { c: ContractView }) {
  const [aState, award, awarding] = useActionState<ProFormState, FormData>(awardAction, {});
  const [cState, close, closing] = useActionState<ProFormState, FormData>(closeAction, {});
  const applicants = c.applicants ?? [];

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold tracking-wider text-ink-500 uppercase">Your contract · {applicants.length} interested</p>
      {applicants.length === 0 ? (
        <p className="rounded-2xl bg-cream-100 p-3 text-sm text-ink-500">No one has applied yet. Colleagues in this room will see it.</p>
      ) : (
        <ul className="divide-y divide-cream-200 rounded-2xl border border-cream-200">
          {applicants.map((a) => {
            const isAwardee = c.awardedToId === a.userId;
            return (
              <li key={a.userId} className="p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={a.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold text-ink-900">
                      {a.name} {a.plus && <PlusBadge />}
                      {a.hasLicense && <BadgeCheck className="size-3.5 fill-gold-500 text-white" aria-label="Licence on file" />}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {a.headline} · {a.state} · {a.yearsExperience} yrs
                    </p>
                  </div>
                  {isAwardee && <span className="rounded-full bg-success-100 px-2 py-0.5 text-[0.7rem] font-bold text-success-600">Awarded</span>}
                </div>
                {a.note && <p className="mt-2 rounded-xl bg-cream-50 p-2.5 text-sm text-ink-700">“{a.note}”</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 font-semibold text-maroon-700">
                    <Mail className="size-3.5" aria-hidden="true" /> Email
                  </a>
                  {a.phone && (
                    <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 font-semibold text-maroon-700">
                      <Phone className="size-3.5" aria-hidden="true" /> Call
                    </a>
                  )}
                  {c.status === "open" && (
                    <form action={award} className="ml-auto">
                      <input type="hidden" name="contractId" value={c.id} />
                      <input type="hidden" name="applicantId" value={a.userId} />
                      <button
                        type="submit"
                        disabled={awarding}
                        className="rounded-full bg-maroon-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-maroon-800 disabled:opacity-60"
                      >
                        Award
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Feedback state={aState} />
      {c.status === "open" && (
        <form action={close}>
          <input type="hidden" name="contractId" value={c.id} />
          <button type="submit" disabled={closing} className="text-sm font-semibold text-ink-500 hover:text-maroon-700 disabled:opacity-60">
            Close without awarding
          </button>
          <Feedback state={cState} />
        </form>
      )}
    </div>
  );
}
