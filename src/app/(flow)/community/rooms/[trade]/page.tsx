import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Briefcase, Lock, MessagesSquare, UsersRound } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { ChatRoom } from "@/components/pro/ChatRoom";
import { ContractCard, PostContractForm } from "@/components/pro/Contracts";
import { TradeIcon } from "@/components/pro/ProBits";
import { EmptyPanel } from "@/components/ui/Blocks";
import { getTrade, isTradeId, type TradeId } from "@/lib/trades";
import { isAdmin } from "@/server/auth/admin";
import { requireUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { read } from "@/server/db/store";
import { contractQuota, planIdFor } from "@/server/plans";
import { listContracts, listMessages, proProfileOf } from "@/server/pros";

export async function generateMetadata({ params }: PageProps<"/community/rooms/[trade]">): Promise<Metadata> {
  const { trade } = await params;
  return { title: isTradeId(trade) ? `${getTrade(trade).label} room` : "Room" };
}

export default function RoomPage({ params, searchParams }: PageProps<"/community/rooms/[trade]">) {
  return (
    <main className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-3xl bg-cream-200/70" />}>
        <Room params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Room({
  params,
  searchParams,
}: {
  params: Promise<{ trade: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ trade: rawTrade }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  if (!isTradeId(rawTrade)) notFound();
  const trade: TradeId = rawTrade;
  const user = await requireUser(`/community/rooms/${trade}`);
  const [db, now] = await Promise.all([read(), requestTime()]);
  const label = getTrade(trade).label;
  const profile = proProfileOf(db, user.id);
  const members = db.pros.filter((p) => p.trade === trade).length;
  const tab = rawTab === "contracts" ? "contracts" : "chat";

  const header = (
    <header className="sticky top-0 z-30 border-b border-cream-200 bg-cream-50/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <BackButton fallback="/community/rooms" />
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-maroon-700 text-gold-400">
          <TradeIcon trade={trade} className="size-5.5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-xl font-semibold text-ink-900">{label}</h1>
          <p className="flex items-center gap-1 text-xs text-ink-500">
            <UsersRound className="size-3.5" aria-hidden="true" /> {members} member{members === 1 ? "" : "s"} nationwide
          </p>
        </div>
      </div>
    </header>
  );

  // Rooms are for colleagues in that trade only.
  if (profile?.trade !== trade) {
    return (
      <>
        {header}
        <div className="px-4 pt-8 sm:px-6">
          <EmptyPanel
            icon={Lock}
            title={`This room is for ${label.toLowerCase()}`}
            text={
              profile
                ? `You're in the ${getTrade(profile.trade).label} room. Change your trade on your profile to join this one instead.`
                : "Add your professional profile to join your trade's room."
            }
            cta={profile ? { href: `/community/rooms/${profile.trade}`, label: "Go to my room" } : { href: "/pro", label: "Add my profile" }}
          />
        </div>
      </>
    );
  }

  const tabLink = (id: "chat" | "contracts", text: string, Icon: typeof Briefcase, count?: number) => (
    <Link
      href={`/community/rooms/${trade}${id === "contracts" ? "?tab=contracts" : ""}`}
      replace
      aria-current={tab === id ? "page" : undefined}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition ${
        tab === id ? "bg-white text-maroon-700 shadow-soft" : "text-ink-500 hover:text-ink-900"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" /> {text}
      {count ? <span className="rounded-full bg-maroon-700 px-1.5 text-[0.65rem] text-white">{count}</span> : null}
    </Link>
  );
  const openContracts = db.contracts.filter((c) => c.trade === trade && c.status === "open").length;

  return (
    <>
      {header}
      <nav aria-label="Room sections" className="sticky top-[4.75rem] z-20 mx-4 mt-3 flex gap-1.5 rounded-2xl bg-cream-100 p-1.5 sm:mx-6">
        {tabLink("chat", "Chat", MessagesSquare)}
        {tabLink("contracts", "Contracts", Briefcase, openContracts)}
      </nav>

      {tab === "chat" ? (
        <ChatRoom trade={trade} roomLabel={label} initial={await listMessages(trade)} viewerId={user.id} canModerate={isAdmin(user)} />
      ) : (
        <ContractsTab trade={trade} userId={user.id} state={profile.state} now={now} />
      )}
    </>
  );
}

async function ContractsTab({ trade, userId, state, now }: { trade: TradeId; userId: string; state: string; now: number }) {
  const db = await read();
  const quota = contractQuota(db, userId, now);
  const contracts = await listContracts(trade, userId);

  return (
    <div className="space-y-4 px-4 pt-4 pb-12 sm:px-6">
      <PostContractForm
        trade={trade}
        defaultState={state}
        quota={{ ...quota, plan: quota.plan.label, isPlus: planIdFor(db, userId, now) === "plus" }}
      />
      {contracts.length === 0 ? (
        <EmptyPanel icon={Briefcase} title="No contracts yet" text="Got more work than you can handle? Offer it to a colleague here." />
      ) : (
        <ul className="space-y-4">
          {contracts.map((c) => (
            <li key={c.id}>
              <ContractCard c={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
