import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BillsExplorer } from "@/components/bills/BillsExplorer";
import { BillsFeedSkeleton } from "@/components/bills/Skeletons";
import { sortForFeed } from "@/lib/bills";
import { listBills } from "@/server/bills-repository";
import { requestTime } from "@/server/clock";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Bills to Pay",
  description: "Swipe through real bills from people in your community and help pay them.",
};

export default function BillsPage() {
  return (
    <>
      <AppHeader />
      <div className="flex items-end justify-between gap-3 px-4 pt-5 sm:px-6">
        <div>
          <h1 className="font-serif text-[2.1rem] leading-tight font-semibold text-ink-900">Bills to Pay</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[0.98rem] text-ink-500">
            Swipe, discover and make a difference
            <Heart className="size-4 text-gold-500" strokeWidth={2} aria-hidden="true" />
          </p>
        </div>
        <Suspense>
          <PostBillShortcut />
        </Suspense>
      </div>
      <Suspense fallback={<BillsFeedSkeleton />}>
        <BillsFeed />
      </Suspense>
    </>
  );
}

/** Beneficiaries get a quick way to post a bill right from the feed. */
async function PostBillShortcut() {
  const user = await getCurrentUser();
  if (user?.role !== "beneficiary") return null;
  return (
    <Link
      href="/bills/new"
      aria-label="Post a bill"
      className="mb-1 grid size-12 shrink-0 place-items-center rounded-2xl bg-maroon-700 text-white shadow-soft transition hover:bg-maroon-800"
    >
      <Plus className="size-6" aria-hidden="true" />
    </Link>
  );
}

async function BillsFeed() {
  // Bills change as people pay them, so always render with fresh data.
  const now = await requestTime();
  const bills = sortForFeed(await listBills(), now);
  return <BillsExplorer bills={bills} now={now} />;
}
