"use client";

import Link from "next/link";
import { BadgeCheck, CircleCheckBig, HandHeart, Megaphone, Sprout } from "lucide-react";
import { useState } from "react";
import { formatNaira, formatRelative } from "@/lib/format";
import type { ActivityEvent, ActivityKind } from "@/server/insights";

const FILTERS: { id: "all" | ActivityKind | "milestones"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "contribution", label: "Contributions" },
  { id: "posted", label: "New bills" },
  { id: "milestones", label: "Funded" },
];

const ICON: Record<ActivityKind, { icon: typeof HandHeart; className: string }> = {
  contribution: { icon: HandHeart, className: "bg-maroon-100 text-maroon-700" },
  posted: { icon: Megaphone, className: "bg-gold-100 text-gold-600" },
  funded: { icon: CircleCheckBig, className: "bg-success-100 text-success-600" },
  completed: { icon: BadgeCheck, className: "bg-ink-900 text-white" },
};

export function ActivityFeed({ events, now, filterable = true }: { events: ActivityEvent[]; now: number; filterable?: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const visible = events.filter((e) =>
    filter === "all" ? true : filter === "milestones" ? e.kind === "funded" || e.kind === "completed" : e.kind === filter,
  );

  return (
    <div>
      {filterable && (
        <div role="group" aria-label="Filter activity" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${
                filter === f.id ? "border-maroon-700 bg-maroon-700 text-white" : "border-cream-300 bg-white text-ink-700 hover:border-maroon-700/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-cream-300 bg-white/70 px-6 py-8 text-center">
          <Sprout className="size-7 text-gold-600" aria-hidden="true" />
          <p className="mt-2 text-sm text-ink-500">Nothing here yet — the village is just getting started.</p>
        </div>
      ) : (
        <ol className={`${filterable ? "mt-4" : ""} divide-y divide-cream-200 rounded-3xl border border-cream-200 bg-white`} aria-live="polite">
          {visible.map((e) => (
            <ActivityRow key={e.id} event={e} now={now} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityRow({ event: e, now }: { event: ActivityEvent; now: number }) {
  const { icon: Icon, className } = ICON[e.kind];
  const first = e.bill.ownerName.split(" ")[0];
  const bill = <span className="font-semibold text-ink-900">{e.bill.title}</span>;

  let text: React.ReactNode;
  switch (e.kind) {
    case "contribution":
      text = (
        <>
          <span className="font-semibold text-ink-900">{e.actor ?? "An anonymous supporter"}</span> contributed{" "}
          <span className="font-semibold text-ink-900 tabular-nums">{formatNaira(e.amount!)}</span> to {first}&apos;s {bill}
        </>
      );
      break;
    case "posted":
      text = (
        <>
          <span className="font-semibold text-ink-900">{e.bill.ownerName}</span> asked the village for help with {bill}
        </>
      );
      break;
    case "funded":
      text = (
        <>
          {first}&apos;s {bill} is fully funded — <span className="font-semibold text-ink-900 tabular-nums">{formatNaira(e.amount!)}</span> raised together
        </>
      );
      break;
    case "completed":
      text = (
        <>
          {first}&apos;s {bill} has been paid to the provider. Done!
        </>
      );
  }

  return (
    <li>
      <Link href={`/bills/${e.bill.id}`} className="flex gap-3 p-4 transition hover:bg-cream-50">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${className}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-relaxed text-ink-700">{text}</span>
          <time dateTime={e.at} className="mt-0.5 block text-xs text-ink-400">
            {formatRelative(e.at, now)}
          </time>
        </span>
      </Link>
    </li>
  );
}
