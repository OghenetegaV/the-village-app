"use client";

import Link from "next/link";
import { Briefcase, Crown, LogOut, PlusCircle, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { ROLES, type Role } from "@/lib/roles";

export function AccountMenu({ user }: { user: { fullName: string; email: string; role: Role; isAdmin: boolean } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2.5 px-4 py-3 text-sm text-ink-900 hover:bg-cream-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Account menu for ${user.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="block rounded-full shadow-soft transition hover:opacity-90"
      >
        <Avatar name={user.fullName} size={44} />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-64 animate-fade-up overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card"
        >
          <div className="border-b border-cream-200 px-4 py-3.5">
            <p className="truncate font-semibold text-ink-900">{user.fullName}</p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            <span className="mt-2 inline-block rounded-full bg-gold-100 px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wider text-gold-600 uppercase">
              {ROLES[user.role].label}
            </span>
          </div>
          <div className="py-1">
            <Link role="menuitem" href="/account" className={item} onClick={() => setOpen(false)}>
              <UserRound className="size-4 text-gold-600" aria-hidden="true" /> My account
            </Link>
            {user.role === "beneficiary" && (
              <Link role="menuitem" href="/bills/new" className={item} onClick={() => setOpen(false)}>
                <PlusCircle className="size-4 text-gold-600" aria-hidden="true" /> Post a bill
              </Link>
            )}
            <Link role="menuitem" href="/community/rooms" className={item} onClick={() => setOpen(false)}>
              <Briefcase className="size-4 text-gold-600" aria-hidden="true" /> Pro rooms
            </Link>
            <Link role="menuitem" href="/plus" className={item} onClick={() => setOpen(false)}>
              <Crown className="size-4 text-gold-600" aria-hidden="true" /> VILLAGE Plus
            </Link>
            {user.isAdmin && (
              <Link role="menuitem" href="/admin" className={item} onClick={() => setOpen(false)}>
                <ShieldCheck className="size-4 text-gold-600" aria-hidden="true" /> Admin console
              </Link>
            )}
            <form action={logout}>
              <button role="menuitem" type="submit" className={`${item} text-maroon-700`}>
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
