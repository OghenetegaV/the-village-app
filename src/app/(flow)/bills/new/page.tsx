import type { Metadata } from "next";
import { Suspense } from "react";
import { PartyPopper } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { PostBillForm } from "@/components/bills/PostBillForm";
import { BILL_LIMITS } from "@/lib/bill-limits";
import { requireUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";

export const metadata: Metadata = { title: "Post a bill" };

export default function NewBillPage({ searchParams }: PageProps<"/bills/new">) {
  return (
    <main className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <BackButton />
      <Suspense>
        <NewBill searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function NewBill({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/bills/new", "beneficiary");
  const { welcome } = await searchParams;
  const now = await requestTime();
  const day = 24 * 60 * 60 * 1000;

  return (
    <>
      {welcome && (
        <p className="mt-5 flex animate-fade-up items-center gap-2.5 rounded-2xl bg-gold-100 p-4 text-sm text-ink-900">
          <PartyPopper className="size-5 shrink-0 text-gold-600" aria-hidden="true" />
          Welcome to VILLAGE, {user.fullName.split(" ")[0]}! Post your first bill below.
        </p>
      )}
      <h1 className="mt-5 font-serif text-[2rem] leading-tight font-semibold text-ink-900">Post a bill</h1>
      <p className="mt-1.5 mb-7 text-ink-500">Tell your village what you need. Clear, honest bills get funded faster.</p>
      <PostBillForm minDate={iso(now + day)} maxDate={iso(now + BILL_LIMITS.maxDays * day)} />
    </>
  );
}
