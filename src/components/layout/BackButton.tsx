"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Goes back (preserving the feed's filters) when we came from inside the app, else to /bills. */
export function BackButton({ fallback = "/bills" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        const internal = document.referrer && new URL(document.referrer).origin === window.location.origin;
        if (internal && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="grid size-11 place-items-center rounded-full bg-white/95 text-ink-900 shadow-card backdrop-blur transition hover:bg-white"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
