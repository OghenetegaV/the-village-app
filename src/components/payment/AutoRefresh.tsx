"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-runs the server-side payment check every few seconds while a payment is still processing. */
export function AutoRefresh({ intervalMs = 5000, maxAttempts = 12 }: { intervalMs?: number; maxAttempts?: number }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (attempts >= maxAttempts) return;
    const id = window.setTimeout(() => {
      setAttempts((a) => a + 1);
      router.refresh();
    }, intervalMs);
    return () => window.clearTimeout(id);
  }, [attempts, intervalMs, maxAttempts, router]);

  if (attempts < maxAttempts) {
    return <p className="mt-4 text-xs text-ink-500" aria-live="polite">Checking again automatically…</p>;
  }
  return (
    <button
      type="button"
      onClick={() => setAttempts(0)}
      className="mt-4 rounded-full bg-cream-100 px-4 py-2 text-sm font-semibold text-maroon-700 hover:bg-cream-200"
    >
      Check again
    </button>
  );
}
