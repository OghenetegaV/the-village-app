"use client";

import { PRICE_RANGES, type PriceRangeId } from "@/lib/price-ranges";

export function PriceFilterBar({
  value,
  onChange,
}: {
  value: PriceRangeId | null;
  onChange: (value: PriceRangeId | null) => void;
}) {
  const options = [
    { id: null, lines: ["All Prices"], label: "All prices" },
    ...PRICE_RANGES.map((r) => ({ id: r.id, lines: [...r.lines], label: r.label })),
  ];

  return (
    <div role="group" aria-label="Filter by total bill amount" className="relative">
      <div className="no-scrollbar flex snap-x gap-2.5 overflow-x-auto px-4 py-1 sm:px-6">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id ?? "all"}
              type="button"
              aria-pressed={active}
              aria-label={option.label}
              onClick={() => onChange(option.id)}
              className={`flex min-h-14 min-w-[7.25rem] shrink-0 snap-start flex-col items-center justify-center rounded-2xl border px-4 text-[0.82rem] leading-tight font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] ${
                active
                  ? "border-maroon-700 bg-maroon-700 text-white shadow-soft"
                  : "border-maroon-700/35 bg-white/60 text-ink-700 hover:border-maroon-700/70 hover:text-maroon-700"
              }`}
            >
              {option.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
