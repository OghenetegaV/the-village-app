"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { BillFilters } from "@/lib/bills";
import { isCategoryId } from "@/lib/categories";
import { isPriceRangeId } from "@/lib/price-ranges";

/**
 * Filters live in the URL (?category=education&price=10k-50k) so they survive refreshes, can be
 * shared, and are restored when returning from a bill. Updates use the native History API, which
 * Next.js syncs with `useSearchParams` without a server round-trip.
 */
export function useBillFilters() {
  const params = useSearchParams();

  const filters = useMemo<BillFilters>(() => {
    const category = params.get("category");
    const price = params.get("price");
    return {
      category: isCategoryId(category) ? category : null,
      price: isPriceRangeId(price) ? price : null,
    };
  }, [params]);

  const setFilters = useCallback(
    (next: Partial<BillFilters>) => {
      const merged = { ...filters, ...next };
      const qs = new URLSearchParams();
      if (merged.price) qs.set("price", merged.price);
      if (merged.category) qs.set("category", merged.category);
      const query = qs.toString();
      window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    },
    [filters],
  );

  const resetFilters = useCallback(() => setFilters({ category: null, price: null }), [setFilters]);

  return { filters, setFilters, resetFilters };
}
