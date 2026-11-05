import Link from "next/link";
import { Bell } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { isAdmin } from "@/server/auth/admin";
import { getCurrentUser } from "@/server/auth/session";
import { unreadCount } from "@/server/notifications";
import { AccountMenu } from "./AccountMenu";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-6">
      <Logo />
      <div className="flex shrink-0 items-center gap-1 min-[400px]:gap-2">
        {/* Session-dependent controls stream in so the rest of the header can be prerendered. */}
        <Suspense fallback={<span className="size-11 animate-pulse rounded-full bg-cream-200" aria-hidden="true" />}>
          <HeaderAccount />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderAccount() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-11 items-center rounded-full bg-maroon-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-maroon-800"
      >
        Sign in
      </Link>
    );
  }
  const unread = await unreadCount(user.id);
  return (
    <>
      <Link
        href="/notifications"
        className="relative grid size-11 place-items-center rounded-full text-maroon-700 transition hover:bg-cream-100"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="size-6" strokeWidth={1.8} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[0.65rem] font-bold text-white ring-2 ring-cream-50">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
      <AccountMenu user={{ fullName: user.fullName, email: user.email, role: user.role, isAdmin: isAdmin(user) }} />
    </>
  );
}
