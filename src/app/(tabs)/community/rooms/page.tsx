import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, Briefcase, Lock, Pencil, UsersRound } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { CommunityTabs, TradeIcon } from "@/components/pro/ProBits";
import { PageTitle, SignInPrompt } from "@/components/ui/Blocks";
import { formatRelative } from "@/lib/format";
import { getTrade } from "@/lib/trades";
import { getCurrentUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { getProProfile, roomSummaries } from "@/server/pros";

export const metadata: Metadata = { title: "Pro rooms" };

export default function RoomsPage() {
  return (
    <>
      <AppHeader />
      <PageTitle title="Community" subtitle="Rooms where professionals across Nigeria talk shop and pass on contract work." />
      <CommunityTabs active="rooms" />
      <Suspense fallback={<div className="mx-4 mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70 sm:mx-6" />}>
        <Rooms />
      </Suspense>
    </>
  );
}

async function Rooms() {
  const [user, now] = await Promise.all([getCurrentUser(), requestTime()]);
  const [profile, rooms] = await Promise.all([user ? getProProfile(user.id) : null, roomSummaries()]);
  const mine = profile ? rooms.find((r) => r.trade === profile.trade) : null;
  const others = rooms.filter((r) => r.trade !== profile?.trade).sort((a, b) => b.members - a.members);

  return (
    <div className="space-y-6 px-4 pt-5 sm:px-6">
      {!user ? (
        <SignInPrompt
          icon={Briefcase}
          title="Find your trade's room"
          text="Sign in and add your professional profile to chat with colleagues and share contract work nationwide."
          next="/community/rooms"
        />
      ) : !profile ? (
        <section className="rounded-3xl bg-maroon-700 p-5 text-white shadow-card">
          <p className="text-xs font-bold tracking-[0.16em] text-gold-400">FOR PROFESSIONALS</p>
          <h2 className="mt-1.5 font-serif text-xl font-semibold">Join your trade&apos;s room</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/80">
            Lawyers, plumbers, electricians and more — meet colleagues across all 36 states and the FCT, and give or get contract work.
          </p>
          <Link href="/pro" className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-maroon-700 transition hover:bg-cream-100">
            Add your professional profile <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        mine && (
          <section aria-label="Your room">
            <Link
              href={`/community/rooms/${mine.trade}`}
              className="flex items-center gap-4 rounded-3xl bg-maroon-700 p-5 text-white shadow-card transition hover:bg-maroon-800"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
                <TradeIcon trade={mine.trade} className="size-7 text-gold-400" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold tracking-[0.16em] text-gold-400">YOUR ROOM</span>
                <span className="block truncate font-serif text-xl font-semibold">{getTrade(mine.trade).label}</span>
                <span className="mt-0.5 block text-sm text-white/75">
                  {mine.members} member{mine.members === 1 ? "" : "s"} · {mine.openContracts} open contract{mine.openContracts === 1 ? "" : "s"}
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
            </Link>
            <p className="mt-2 flex items-center justify-between text-xs text-ink-500">
              <span className="flex items-center gap-1">
                <BadgeCheck className="size-3.5 text-gold-600" aria-hidden="true" /> {profile.headline} · {profile.state}
              </span>
              <Link href="/pro" className="inline-flex items-center gap-1 font-semibold text-maroon-700 hover:underline">
                <Pencil className="size-3" aria-hidden="true" /> Edit profile
              </Link>
            </p>
          </section>
        )
      )}

      <section aria-labelledby="all-rooms">
        <h2 id="all-rooms" className="font-serif text-xl font-semibold text-ink-900">
          {profile ? "Other trades" : "All trades"}
        </h2>
        <p className="mt-0.5 text-sm text-ink-500">Each room is for members of that trade only.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {others.map((r) => (
            <li key={r.trade} className="rounded-2xl border border-cream-200 bg-white p-3.5">
              <span className="flex items-center gap-2.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream-100 text-maroon-700">
                  <TradeIcon trade={r.trade} className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{getTrade(r.trade).label}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-500">
                    <UsersRound className="size-3" aria-hidden="true" /> {r.members}
                    {r.openContracts > 0 && <> · {r.openContracts} jobs</>}
                  </span>
                </span>
              </span>
              <span className="mt-2 flex items-center gap-1 text-[0.7rem] text-ink-400">
                <Lock className="size-3" aria-hidden="true" />
                {r.lastActivityAt ? `Active ${formatRelative(r.lastActivityAt, now)}` : "Members only"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
