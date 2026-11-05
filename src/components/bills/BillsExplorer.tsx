"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { filterBills } from "@/lib/bills";
import { getCategory } from "@/lib/categories";
import { getPriceRange } from "@/lib/price-ranges";
import type { Bill } from "@/lib/types";
import { BillCarousel } from "./BillCarousel";
import { CategoryNav } from "./CategoryNav";
import { EmptyState } from "./EmptyState";
import { PriceFilterBar } from "./PriceFilterBar";
import { useBillFilters } from "./use-bill-filters";

/** `bills` arrive pre-sorted for the feed; filtering happens instantly on the client. */
export function BillsExplorer({ bills, now }: { bills: Bill[]; now: number }) {
  const { filters, setFilters, resetFilters } = useBillFilters();
  const visible = useMemo(() => filterBills(bills, filters), [bills, filters]);

  const categoryLabel = filters.category ? getCategory(filters.category).label : null;
  const priceLabel = filters.price ? getPriceRange(filters.price).label : null;
  const hasFilters = Boolean(categoryLabel || priceLabel);

  const noun = `${categoryLabel ? `${categoryLabel} ` : ""}bill${visible.length === 1 ? "" : "s"}`;
  const emptyDescription = `any ${categoryLabel ? `${categoryLabel.toLowerCase()} ` : ""}bills${priceLabel ? ` in the ${priceLabel} range` : ""}`;

  return (
    <>
      <div className="mt-5">
        <PriceFilterBar value={filters.price} onChange={(price) => setFilters({ price })} />
      </div>
      <div className="mt-4">
        <CategoryNav value={filters.category} onChange={(category) => setFilters({ category })} />
      </div>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3 px-4 sm:px-6" aria-live="polite">
        <p className="text-sm text-ink-500">
          <span className="font-bold text-ink-900">{visible.length}</span> {noun}
          {priceLabel && <span> · {priceLabel}</span>}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-maroon-700 transition hover:bg-cream-200"
          >
            <X className="size-3.5" aria-hidden="true" />
            Reset filters
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        // Re-mount on filter change so the feed starts from the first matching bill.
        <BillCarousel key={`${filters.category}-${filters.price}`} bills={visible} now={now} />
      ) : (
        <EmptyState
          description={emptyDescription}
          onReset={resetFilters}
          onClearPrice={filters.category && filters.price ? () => setFilters({ price: null }) : undefined}
        />
      )}
    </>
  );
}
