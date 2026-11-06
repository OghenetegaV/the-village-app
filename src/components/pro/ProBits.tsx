import Link from "next/link";
import {
  BrickWall,
  Brush,
  Calculator,
  Camera,
  Car,
  ChefHat,
  Code,
  Crown,
  Flame,
  Grid3x3,
  Hammer,
  HardHat,
  PaintRoller,
  PlugZap,
  Scale,
  Scissors,
  Snowflake,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { TradeId } from "@/lib/trades";

export const TRADE_ICONS: Record<TradeId, LucideIcon> = {
  lawyers: Scale,
  plumbers: Wrench,
  electricians: PlugZap,
  carpenters: Hammer,
  builders: BrickWall,
  engineers: HardHat,
  painters: PaintRoller,
  tilers: Grid3x3,
  welders: Flame,
  "ac-technicians": Snowflake,
  mechanics: Car,
  tailors: Scissors,
  beauty: Brush,
  caterers: ChefHat,
  photographers: Camera,
  developers: Code,
  accountants: Calculator,
};

export function TradeIcon({ trade, ...props }: { trade: TradeId } & LucideProps) {
  const Icon = TRADE_ICONS[trade];
  return <Icon aria-hidden="true" {...props} />;
}

export function PlusBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-gold-500 px-1.5 py-0.5 text-[0.6rem] font-extrabold tracking-wider text-white ${className}`}
      title="VILLAGE Plus member"
    >
      <Crown className="size-2.5" aria-hidden="true" />
      PLUS
    </span>
  );
}

/** Segmented switch between the activity feed and Pro rooms. */
export function CommunityTabs({ active }: { active: "activity" | "rooms" }) {
  const tab = (id: "activity" | "rooms", href: string, label: string) => (
    <Link
      href={href}
      aria-current={active === id ? "page" : undefined}
      className={`flex-1 rounded-xl py-2.5 text-center text-sm font-semibold transition ${
        active === id ? "bg-white text-maroon-700 shadow-soft" : "text-ink-500 hover:text-ink-900"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Community sections" className="mx-4 mt-5 flex gap-1.5 rounded-2xl bg-cream-100 p-1.5 sm:mx-6">
      {tab("activity", "/community", "Activity")}
      {tab("rooms", "/community/rooms", "Pro rooms")}
    </nav>
  );
}
