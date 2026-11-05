import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BadgeCheck, CalendarClock, CircleCheckBig, Clock3, Landmark, ShieldCheck, UsersRound } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";
import { BillDetailSkeleton } from "@/components/bills/Skeletons";
import { ContributeForm } from "@/components/payment/ContributeForm";
import { SignInToContribute } from "@/components/payment/SignInToContribute";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { CoverImage } from "@/components/ui/CoverImage";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { billStatus, percentFunded, remainingAmount } from "@/lib/bills";
import { getCategory } from "@/lib/categories";
import { daysLeft, formatDate, formatDaysLeft, formatNaira } from "@/lib/format";
import { getBill } from "@/server/bills-repository";
import { requestTime } from "@/server/clock";
import { isAdmin } from "@/server/auth/admin";
import { isPaystackConfigured } from "@/server/payments/paystack";
import { getCurrentUser } from "@/server/auth/session";

export async function generateMetadata({ params }: PageProps<"/bills/[id]">): Promise<Metadata> {
  await connection();
  const bill = await getBill((await params).id);
  return bill && !bill.removedAt ? { title: bill.title, description: bill.summary } : { title: "Bill not found" };
}

export default function BillPage({ params }: PageProps<"/bills/[id]">) {
  return (
    <main className="pb-10">
      <Suspense fallback={<BillDetailSkeleton />}>
        <BillDetail params={params} />
      </Suspense>
    </main>
  );
}

async function BillDetail({ params }: { params: Promise<{ id: string }> }) {
  const now = await requestTime();
  const viewer = await getCurrentUser();
  const bill = await getBill((await params).id);
  if (!bill) notFound();

  const status = billStatus(bill, now);
  // Removed bills are only visible to their owner (so they can see why) and to admins.
  if (status === "removed" && viewer?.id !== bill.ownerId && !isAdmin(viewer)) notFound();
  const pct = percentFunded(bill);
  const remaining = remainingAmount(bill);
  const category = getCategory(bill.category);
  const days = daysLeft(bill.deadline, now);

  return (
    <article>
      <div className="relative">
        <CoverImage src={bill.coverImageUrl} category={bill.category} sizes="520px" priority className="aspect-[4/3]" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <BackButton />
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="relative -mt-7 rounded-t-[1.75rem] bg-cream-50 px-5 pt-6 sm:px-6">
        {status === "removed" && (
          <div role="status" className="mb-5 rounded-2xl border border-maroon-700/20 bg-maroon-100 p-4 text-sm text-maroon-800">
            <p className="font-semibold">This bill was removed by the VILLAGE team and is no longer public.</p>
            {bill.removalReason && <p className="mt-1">Reason: {bill.removalReason}</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon-700 px-3 py-1.5 text-[0.8rem] font-semibold text-white">
            <CategoryIcon category={bill.category} className="size-4" strokeWidth={2} />
            {category.label}
          </span>
          {status === "open" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-[0.8rem] font-semibold text-ink-900">
              <Clock3 className="size-3.5 text-gold-600" aria-hidden="true" />
              {formatDaysLeft(days)}
            </span>
          )}
        </div>

        <h1 className="mt-3 font-serif text-[1.85rem] leading-tight font-semibold text-ink-900">{bill.title}</h1>

        <div className="mt-4 flex items-center gap-3">
          <Avatar name={bill.owner.name} src={bill.owner.avatarUrl} size={48} />
          <div>
            <p className="flex items-center gap-1 font-semibold text-ink-900">
              {bill.owner.name}
              {bill.owner.verified && <BadgeCheck className="size-4 fill-gold-500 text-white" aria-hidden="true" />}
            </p>
            <p className="text-sm text-ink-500">
              {bill.owner.location}
              {bill.owner.verified && " · Verified beneficiary"}
            </p>
          </div>
        </div>

        {/* Funding summary */}
        <section aria-label="Funding progress" className="mt-6 rounded-3xl border border-cream-200 bg-white p-5 shadow-soft">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-ink-500">Raised so far</p>
              <p className="text-[1.9rem] leading-tight font-extrabold tracking-tight tabular-nums text-ink-900">
                {formatNaira(bill.raisedAmount)}
              </p>
            </div>
            <p className="pb-1 text-right text-sm text-ink-500">
              of <span className="font-bold text-ink-900">{formatNaira(bill.totalAmount)}</span>
            </p>
          </div>
          <div className="mt-3">
            <ProgressBar percent={pct} complete={status !== "open"} size="lg" label={`${pct}% funded`} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Remaining" value={formatNaira(remaining)} highlight={remaining === 0} />
            <Stat label="Funded" value={`${pct}%`} />
            <Stat label="Contributors" value={bill.contributorCount.toLocaleString("en-NG")} icon={<UsersRound className="size-3.5" />} />
          </dl>
        </section>

        {/* Trust */}
        <section className="mt-4 space-y-3 rounded-3xl bg-cream-100 p-5 text-sm">
          <p className="flex gap-3">
            <Landmark className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-ink-900">Paid directly to</span>
              <span className="text-ink-700">{bill.payee}</span>
            </span>
          </p>
          <p className="flex gap-3">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-ink-900">Needed by {formatDate(bill.deadline)}</span>
              <span className="text-ink-700">Posted {formatDate(bill.createdAt)}</span>
            </span>
          </p>
          <p className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden="true" />
            <span className="text-ink-700">
              {bill.allowsPartialPayments
                ? "Accepts contributions of any size. Progress updates only after your payment is confirmed."
                : "This bill is paid in full by one person, so the whole outstanding amount is settled at once."}
            </span>
          </p>
        </section>

        {/* Story */}
        <section className="mt-7">
          <h2 className="font-serif text-xl font-semibold text-ink-900">{bill.owner.name.split(" ")[0]}&apos;s story</h2>
          <div className="mt-3 space-y-3 leading-relaxed text-ink-700">
            {bill.story.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Pay */}
        <section id="contribute" aria-labelledby="contribute-heading" className="mt-8 scroll-mt-4">
          {status === "open" ? (
            !viewer ? (
              <SignInToContribute billId={bill.id} ownerFirstName={bill.owner.name.split(" ")[0]} />
            ) : viewer.id === bill.ownerId ? (
              <div className="rounded-3xl border border-cream-200 bg-white p-6 text-center shadow-soft">
                <h2 id="contribute-heading" className="font-serif text-xl font-semibold text-ink-900">This is your bill</h2>
                <p className="mt-1 text-sm text-ink-700">Share it with friends and family — every contribution shows up here once confirmed.</p>
              </div>
            ) : (
              <ContributeForm
                bill={bill}
                now={now}
                paymentsEnabled={isPaystackConfigured()}
                viewer={{ fullName: viewer.fullName, email: viewer.email }}
              />
            )
          ) : (
            <div className="flex flex-col items-center rounded-3xl bg-success-100 p-6 text-center">
              <CircleCheckBig className="size-10 text-success-600" aria-hidden="true" />
              <h2 id="contribute-heading" className="mt-3 font-serif text-xl font-semibold text-ink-900">
                {status === "completed"
                  ? "This bill has been paid"
                  : status === "funded"
                    ? "This bill is fully funded"
                    : status === "removed"
                      ? "Not accepting contributions"
                      : "This bill has closed"}
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                {status === "expired" || status === "removed"
                  ? "It's no longer accepting contributions."
                  : `Thank you to all ${bill.contributorCount} contributors who made it happen.`}
              </p>
              {status === "completed" && bill.completedAt && (
                <p className="mt-2 text-xs text-ink-500">
                  Paid to {bill.payee} on {formatDate(bill.completedAt)}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function Stat({ label, value, highlight, icon }: { label: string; value: string; highlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-cream-50 px-2 py-2.5">
      <dt className="flex items-center justify-center gap-1 text-[0.72rem] text-ink-500">
        {icon}
        {label}
      </dt>
      <dd className={`mt-0.5 font-bold ${highlight ? "text-success-600" : "text-ink-900"}`}>{value}</dd>
    </div>
  );
}
