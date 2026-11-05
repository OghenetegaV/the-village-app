import { Logo } from "@/components/brand/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10 sm:px-6">
      <Logo />
      <div className="mt-10">
        <h1 className="font-serif text-[2rem] leading-tight font-semibold text-ink-900">{title}</h1>
        <p className="mt-1.5 text-ink-500">{subtitle}</p>
      </div>
      <div className="mt-7">{children}</div>
    </main>
  );
}
