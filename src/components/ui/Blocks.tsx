import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-5 sm:px-6">
      <h1 className="font-serif text-[2.1rem] leading-tight font-semibold text-ink-900">{title}</h1>
      {subtitle && <p className="mt-1 text-[0.98rem] text-ink-500">{subtitle}</p>}
    </div>
  );
}

export function SectionHeader({ title, href, linkLabel = "See all", id }: { title: string; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="font-serif text-xl font-semibold text-ink-900">
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center text-sm font-semibold text-maroon-700 hover:underline">
          {linkLabel}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "solid",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "solid" | "light";
}) {
  return (
    <div className={`rounded-3xl p-4 ${tone === "solid" ? "bg-maroon-700 text-white" : "border border-cream-200 bg-white text-ink-900"}`}>
      <p className={`flex items-center gap-1.5 text-xs ${tone === "solid" ? "text-white/70" : "text-ink-500"}`}>
        {Icon && <Icon className={`size-3.5 ${tone === "solid" ? "text-gold-400" : "text-gold-600"}`} aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

export function EmptyPanel({ icon: Icon, title, text, cta }: { icon: LucideIcon; title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-cream-300 bg-white/70 px-6 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-cream-100 text-maroon-700">
        <Icon className="size-6" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h3 className="mt-3 font-serif text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{text}</p>
      {cta && (
        <Link href={cta.href} className="mt-5 rounded-2xl bg-maroon-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-maroon-800">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

/** Card shown to signed-out visitors on pages that need an account. */
export function SignInPrompt({ icon: Icon, title, text, next }: { icon: LucideIcon; title: string; text: string; next: string }) {
  const n = encodeURIComponent(next);
  return (
    <div className="flex flex-col items-center rounded-3xl border border-cream-200 bg-white p-6 text-center shadow-card">
      <span className="grid size-14 place-items-center rounded-full bg-cream-100 text-maroon-700">
        <Icon className="size-7" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h2 className="mt-3 font-serif text-xl font-semibold text-ink-900">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-700">{text}</p>
      <div className="mt-5 flex w-full flex-col gap-2.5">
        <Link href={`/register?next=${n}`} className="flex h-13 items-center justify-center rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800">
          Create an account
        </Link>
        <Link
          href={`/login?next=${n}`}
          className="flex h-13 items-center justify-center rounded-2xl border border-maroon-700/30 font-semibold text-maroon-700 transition hover:bg-cream-100"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
