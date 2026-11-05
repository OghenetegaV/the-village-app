import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-cream-100 text-maroon-700">
        <SearchX className="size-9" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h1 className="mt-5 font-serif text-3xl font-semibold text-ink-900">We couldn&apos;t find that</h1>
      <p className="mt-2 max-w-xs text-ink-500">The bill may have been removed or the link is incorrect.</p>
      <Link href="/bills" className="mt-8 rounded-2xl bg-maroon-700 px-6 py-3.5 font-semibold text-white hover:bg-maroon-800">
        Back to bills
      </Link>
    </main>
  );
}
