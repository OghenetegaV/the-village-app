import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Info, LogOut, Mail, MapPin, Phone, PlusCircle, ReceiptText } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { billStatus, percentFunded } from "@/lib/bills";
import { formatDate, formatNaira } from "@/lib/format";
import { ROLES } from "@/lib/roles";
import type { PublicUser } from "@/lib/types";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { listBillsByOwner, listContributionsByUser } from "@/server/bills-repository";
import { requireUser } from "@/server/auth/session";
import { requestTime } from "@/server/clock";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<div className="mx-4 mt-6 h-48 animate-pulse rounded-3xl bg-cream-200/70" />}>
        <Account searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Account({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/account");
  const { notice } = await searchParams;

  return (
    <div className="px-4 pt-4 sm:px-6">
      {notice === "beneficiary-only" && (
        <p role="status" className="mb-4 flex gap-2 rounded-2xl bg-gold-100 p-3.5 text-sm text-ink-900">
          <Info className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
          Posting bills is for Beneficiary accounts. As a Supporter, you can help pay bills in the feed.
        </p>
      )}

      <ProfileCard user={user} />

      {user.role === "supporter" ? <SupporterActivity userId={user.id} /> : <BeneficiaryBills userId={user.id} />}

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-maroon-700/25 font-semibold text-maroon-700 transition hover:bg-cream-100"
        >
          <LogOut className="size-4.5" aria-hidden="true" /> Sign out
        </button>
      </form>
    </div>
  );
}

function ProfileCard({ user }: { user: PublicUser }) {
  return (
    <section className="rounded-3xl border border-cream-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <Avatar name={user.fullName} size={60} />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-semibold text-ink-900">{user.fullName}</h1>
          <span className="mt-1 inline-block rounded-full bg-gold-100 px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wider text-gold-600 uppercase">
            {ROLES[user.role].label}
          </span>
        </div>
      </div>
      <dl className="mt-5 space-y-2.5 text-sm">
        <Detail icon={<Mail className="size-4" />} label="Email" value={user.email} />
        {user.phone && <Detail icon={<Phone className="size-4" />} label="Phone" value={user.phone} />}
        {user.location && <Detail icon={<MapPin className="size-4" />} label="Location" value={user.location} />}
      </dl>
      <p className="mt-4 text-xs text-ink-500">Member since {formatDate(user.createdAt)}</p>
    </section>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="text-gold-600">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="truncate text-ink-700">{value}</dd>
    </div>
  );
}


async function SupporterActivity({ userId }: { userId: string }) {
  const contributions = await listContributionsByUser(userId);
  const confirmed = contributions.filter((c) => c.payment.status === "success");
  const total = confirmed.reduce((sum, c) => sum + c.payment.amount, 0);
  const billsHelped = new Set(confirmed.map((c) => c.payment.billId)).size;

  return (
    <section className="mt-6" aria-labelledby="giving-heading">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total given" value={formatNaira(total)} />
        <Stat label="Bills helped" value={String(billsHelped)} />
      </div>

      <h2 id="giving-heading" className="mt-7 font-serif text-xl font-semibold text-ink-900">
        Your contributions
      </h2>
      {contributions.length === 0 ? (
        <Empty
          text="You haven't contributed to a bill yet. Every naira makes a difference."
          cta={{ href: "/bills", label: "Discover bills to pay" }}
        />
      ) : (
        <ul className="mt-3 divide-y divide-cream-200 rounded-3xl border border-cream-200 bg-white">
          {contributions.map(({ payment, bill }) => (
            <li key={payment.reference}>
              <Link href={bill ? `/bills/${bill.id}` : "#"} className="flex items-center gap-3 p-4 transition hover:bg-cream-50">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-100 text-maroon-700">
                  {bill ? <CategoryIcon category={bill.category} className="size-5" /> : <ReceiptText className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink-900">{bill?.title ?? "Bill removed"}</span>
                  <span className="block text-xs text-ink-500">
                    {bill?.owner.name} · {formatDate(payment.confirmedAt ?? payment.createdAt)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold tabular-nums text-ink-900">{formatNaira(payment.amount)}</span>
                  <span className="mt-1 block">
                    <PaymentStatusBadge status={payment.status} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function BeneficiaryBills({ userId }: { userId: string }) {
  const [bills, now] = await Promise.all([listBillsByOwner(userId), requestTime()]);
  const raised = bills.reduce((sum, b) => sum + b.raisedAmount, 0);

  return (
    <section className="mt-6" aria-labelledby="bills-heading">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Raised so far" value={formatNaira(raised)} />
        <Stat label="Bills posted" value={String(bills.length)} />
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <h2 id="bills-heading" className="font-serif text-xl font-semibold text-ink-900">
          Your bills
        </h2>
        <Link
          href="/bills/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-maroon-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-maroon-800"
        >
          <PlusCircle className="size-4" aria-hidden="true" /> Post a bill
        </Link>
      </div>

      {bills.length === 0 ? (
        <Empty text="You haven't posted a bill yet. Tell your village what you need." cta={{ href: "/bills/new", label: "Post your first bill" }} />
      ) : (
        <ul className="mt-3 space-y-3">
          {bills.map((bill) => {
            const pct = percentFunded(bill);
            const status = billStatus(bill, now);
            return (
              <li key={bill.id}>
                <Link href={`/bills/${bill.id}`} className="block rounded-3xl border border-cream-200 bg-white p-4 transition hover:shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIcon category={bill.category} className="size-4 shrink-0 text-gold-600" />
                      <span className="truncate font-semibold text-ink-900">{bill.title}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-cream-100 px-2.5 py-0.5 text-[0.7rem] font-bold text-ink-700 capitalize">
                      {status === "open" ? (bill.owner.verified ? "Live" : "Unverified") : status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar percent={pct} complete={status !== "open"} label={`${pct}% funded`} />
                    <span className="shrink-0 text-xs font-semibold text-ink-700">{pct}%</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-500">
                    <span className="font-bold tabular-nums text-ink-900">{formatNaira(bill.raisedAmount)}</span> of{" "}
                    {formatNaira(bill.totalAmount)} · {bill.contributorCount} contributor{bill.contributorCount === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-maroon-700 p-4 text-white">
      <p className="text-xs text-white/70">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function Empty({ text, cta }: { text: string; cta: { href: string; label: string } }) {
  return (
    <div className="mt-3 rounded-3xl border border-dashed border-cream-300 bg-white/70 p-6 text-center">
      <p className="text-sm text-ink-500">{text}</p>
      <Link href={cta.href} className="mt-4 inline-block rounded-2xl bg-maroon-700 px-5 py-3 text-sm font-semibold text-white hover:bg-maroon-800">
        {cta.label}
      </Link>
    </div>
  );
}
