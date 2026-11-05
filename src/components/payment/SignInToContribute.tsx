import Link from "next/link";
import { HandHeart } from "lucide-react";

export function SignInToContribute({ billId, ownerFirstName }: { billId: string; ownerFirstName: string }) {
  const next = encodeURIComponent(`/bills/${billId}#contribute`);
  return (
    <div className="flex flex-col items-center rounded-3xl border border-cream-200 bg-white p-6 text-center shadow-card">
      <span className="grid size-14 place-items-center rounded-full bg-cream-100 text-maroon-700">
        <HandHeart className="size-7" strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h2 id="contribute-heading" className="mt-3 font-serif text-xl font-semibold text-ink-900">
        Help {ownerFirstName} pay this bill
      </h2>
      <p className="mt-1 max-w-xs text-sm text-ink-700">
        Sign in or create a free Supporter account to contribute, get receipts and track your impact.
      </p>
      <div className="mt-5 flex w-full flex-col gap-2.5">
        <Link
          href={`/register?role=supporter&next=${next}`}
          className="flex h-13 items-center justify-center rounded-2xl bg-maroon-700 font-semibold text-white transition hover:bg-maroon-800"
        >
          Create an account
        </Link>
        <Link
          href={`/login?next=${next}`}
          className="flex h-13 items-center justify-center rounded-2xl border border-maroon-700/30 font-semibold text-maroon-700 transition hover:bg-cream-100"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
