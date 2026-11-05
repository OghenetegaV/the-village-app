import { Bell, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AppHeader({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-6">
      <Logo />
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative grid size-11 place-items-center rounded-full text-maroon-700 transition hover:bg-cream-100"
          aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
        >
          <Bell className="size-6" strokeWidth={1.8} />
          {unreadNotifications > 0 && (
            <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-danger-500 ring-2 ring-cream-50" />
          )}
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full bg-gold-500 text-white shadow-soft transition hover:bg-gold-600"
          aria-label="Your profile"
        >
          <UserRound className="size-6" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
