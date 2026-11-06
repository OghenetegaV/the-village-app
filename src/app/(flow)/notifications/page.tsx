import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck, Banknote, Bell, Briefcase, CheckCheck, CircleCheckBig, Crown, HandHeart, Handshake, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { markAllNotificationsRead, openNotification } from "@/app/actions/notifications";
import { BackButton } from "@/components/layout/BackButton";
import { EmptyPanel } from "@/components/ui/Blocks";
import { formatRelative } from "@/lib/format";
import type { NotificationKind } from "@/lib/types";
import { requireUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";
import { listNotifications } from "@/server/notifications";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  welcome: { icon: Sparkles, className: "bg-gold-100 text-gold-600" },
  contribution_received: { icon: HandHeart, className: "bg-maroon-100 text-maroon-700" },
  bill_funded: { icon: CircleCheckBig, className: "bg-success-100 text-success-600" },
  bill_verified: { icon: BadgeCheck, className: "bg-gold-100 text-gold-600" },
  bill_removed: { icon: TriangleAlert, className: "bg-maroon-100 text-maroon-700" },
  payout_made: { icon: Banknote, className: "bg-success-100 text-success-600" },
  contract_interest: { icon: Briefcase, className: "bg-gold-100 text-gold-600" },
  contract_awarded: { icon: Handshake, className: "bg-success-100 text-success-600" },
  plus_activated: { icon: Crown, className: "bg-gold-100 text-gold-600" },
};

export default function NotificationsPage() {
  return (
    <main className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <BackButton fallback="/home" />
      <Suspense fallback={<div className="mt-6 h-80 animate-pulse rounded-3xl bg-cream-200/70" />}>
        <Notifications />
      </Suspense>
    </main>
  );
}

async function Notifications() {
  const user = await requireUser("/notifications");
  const [items, now] = await Promise.all([listNotifications(user.id), requestTime()]);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-semibold text-ink-900">Notifications</h1>
          <p className="mt-1 text-ink-500">{unread ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3.5 py-2 text-sm font-semibold text-maroon-700 transition hover:bg-cream-200"
            >
              <CheckCheck className="size-4" aria-hidden="true" /> Mark all read
            </button>
          </form>
        )}
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyPanel icon={Bell} title="No notifications yet" text="We'll let you know when someone helps your bill or a bill you supported moves forward." />
        ) : (
          <ul className="divide-y divide-cream-200 overflow-hidden rounded-3xl border border-cream-200 bg-white">
            {items.map((n) => {
              const { icon: Icon, className } = ICONS[n.kind];
              return (
                <li key={n.id}>
                  {/* A form post marks it read and then opens the link — works without JavaScript. */}
                  <form action={openNotification}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className={`flex w-full gap-3 p-4 text-left transition hover:bg-cream-50 ${n.readAt ? "" : "bg-gold-100/40"}`}>
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${className}`}>
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm text-ink-900 ${n.readAt ? "font-medium" : "font-bold"}`}>{n.title}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-ink-700">{n.body}</span>
                        <time dateTime={n.createdAt} className="mt-1 block text-xs text-ink-400">
                          {formatRelative(n.createdAt, now)}
                        </time>
                      </span>
                      {!n.readAt && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-maroon-700" aria-label="Unread" />}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
