"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Heart, House, UsersRound, WalletMinimal, type LucideIcon } from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/community", label: "Community", icon: UsersRound },
  { href: "/impact", label: "Impact", icon: Heart },
  { href: "/wallet", label: "Wallet", icon: WalletMinimal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-cream-200 bg-cream-50/95 pb-safe backdrop-blur-md"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 pt-3 pb-2.5 text-[0.78rem] transition-colors ${
                  active ? "font-bold text-maroon-700" : "font-medium text-ink-700 hover:text-maroon-700"
                }`}
              >
                <Icon className={`size-6 ${active ? "text-maroon-700" : "text-gold-600"}`} strokeWidth={1.7} />
                {label}
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 h-[3px] w-10 rounded-full bg-maroon-700 transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
