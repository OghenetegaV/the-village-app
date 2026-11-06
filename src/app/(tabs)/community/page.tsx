import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleCheckBig, HandCoins, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ActivityFeed } from "@/components/community/ActivityFeed";
import { PageTitle, StatTile } from "@/components/ui/Blocks";
import { CommunityTabs } from "@/components/pro/ProBits";
import { formatNairaCompact } from "@/lib/format";
import { requestTime } from "@/server/clock";
import { activityFeed, snapshot, villageStats } from "@/server/insights";

export const metadata: Metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <>
      <AppHeader />
      <PageTitle title="Community" subtitle="Every contribution, new bill and milestone across the village." />
      <CommunityTabs active="activity" />
      <Suspense fallback={<div className="mx-4 mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70 sm:mx-6" />}>
        <Community />
      </Suspense>
    </>
  );
}

async function Community() {
  const [now, db] = await Promise.all([requestTime(), snapshot()]);
  const stats = villageStats(db.bills, now);

  return (
    <div className="px-4 pt-5 sm:px-6">
      <section aria-label="Community totals" className="grid grid-cols-3 gap-2.5">
        <StatTile label="Raised" value={formatNairaCompact(stats.totalRaised)} icon={HandCoins} />
        <StatTile label="People helped" value={String(stats.peopleHelped)} icon={UsersRound} tone="light" />
        <StatTile label="Funded" value={String(stats.billsFunded)} icon={CircleCheckBig} tone="light" />
      </section>

      <section aria-labelledby="feed-heading" className="mt-7">
        <h2 id="feed-heading" className="sr-only">
          Activity
        </h2>
        <ActivityFeed events={activityFeed(db.bills, db.payments)} now={now} />
        <p className="mt-4 text-center text-xs text-ink-400">Supporters who give anonymously are never named.</p>
      </section>
    </div>
  );
}
