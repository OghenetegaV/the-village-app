import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, Banknote, ClipboardList, ExternalLink, Mail, Phone, ShieldAlert, ShieldCheck } from "lucide-react";
import { PayoutForm, RemoveBillForm, VerifyBillForm } from "@/components/admin/AdminForms";
import { BackButton } from "@/components/layout/BackButton";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { EmptyPanel } from "@/components/ui/Blocks";
import { getCategory } from "@/lib/categories";
import { formatDate, formatNaira, formatRelative } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";
import { adminQueues } from "@/server/admin";
import { requireAdminPage } from "@/server/auth/admin";
import { requestTime } from "@/server/clock";

// No page title: non-admins get a 404 here, and the tab title shouldn't reveal the console exists.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const TABS = [
  { id: "verify", label: "Verify", icon: ShieldCheck },
  { id: "payouts", label: "Payouts", icon: Banknote },
  { id: "review", label: "Review", icon: ShieldAlert },
  { id: "log", label: "Log", icon: ClipboardList },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12 sm:px-6">
      <div className="flex items-center gap-3">
        <BackButton fallback="/account" />
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-gold-600">VILLAGE OPERATIONS</p>
          <h1 className="font-serif text-2xl font-semibold text-ink-900">Admin console</h1>
        </div>
      </div>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-3xl bg-cream-200/70" />}>
        <Console searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Console({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage("/admin");
  const [{ tab: rawTab }, now] = await Promise.all([searchParams, requestTime()]);
  const tab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "verify";
  const q = await adminQueues(now);
  const counts: Record<TabId, number | null> = {
    verify: q.toVerify.length,
    payouts: q.toPayOut.length,
    review: q.inReview.length,
    log: null,
  };

  return (
    <>
      <nav aria-label="Admin sections" className="mt-6 grid grid-cols-4 gap-1.5 rounded-2xl bg-cream-100 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = id === tab;
          return (
            <Link
              key={id}
              href={`/admin?tab=${id}`}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs font-semibold transition ${
                active ? "bg-white text-maroon-700 shadow-soft" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {label}
              {counts[id] ? (
                <span className="absolute top-1.5 right-2 grid min-w-5 place-items-center rounded-full bg-maroon-700 px-1 text-[0.65rem] text-white">
                  {counts[id]}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <section className="mt-6" aria-live="polite">
        {tab === "verify" && <VerifyQueue bills={q.toVerify} now={now} />}
        {tab === "payouts" && <PayoutQueue bills={q.toPayOut} now={now} />}
        {tab === "review" && <ReviewQueue payments={q.inReview} />}
        {tab === "log" && <AuditLog entries={q.recentAudit} now={now} />}
      </section>
    </>
  );
}

const card = "rounded-3xl border border-cream-200 bg-white p-5 shadow-soft";

function VerifyQueue({ bills, now }: { bills: Awaited<ReturnType<typeof adminQueues>>["toVerify"]; now: number }) {
  if (!bills.length) return <EmptyPanel icon={BadgeCheck} title="All caught up" text="No bills are waiting for verification." />;
  return (
    <>
      <p className="text-sm text-ink-500">
        Confirm the invoice with the payee before verifying. Oldest first.
      </p>
      <ul className="mt-4 space-y-4">
      {bills.map((b) => (
        <li key={b.id} className={card}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-600">
                <CategoryIcon category={b.category} className="size-3.5" /> {getCategory(b.category).label} · posted {formatRelative(b.createdAt, now)}
              </p>
              <h2 className="mt-1 font-serif text-lg font-semibold text-ink-900">{b.title}</h2>
            </div>
            <p className="shrink-0 text-lg font-extrabold tabular-nums text-ink-900">{formatNaira(b.totalAmount)}</p>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-700">{b.story}</p>
          <dl className="mt-4 space-y-1.5 rounded-2xl bg-cream-50 p-3.5 text-sm">
            <Row label="Owner">{b.owner.name} · {b.owner.location}</Row>
            {b.ownerAccount?.phone && (
              <Row label="Phone">
                <a href={`tel:${b.ownerAccount.phone}`} className="inline-flex items-center gap-1 font-semibold text-maroon-700">
                  <Phone className="size-3.5" aria-hidden="true" /> {b.ownerAccount.phone}
                </a>
              </Row>
            )}
            {b.ownerAccount?.email && (
              <Row label="Email">
                <a href={`mailto:${b.ownerAccount.email}`} className="inline-flex items-center gap-1 font-semibold text-maroon-700">
                  <Mail className="size-3.5" aria-hidden="true" /> {b.ownerAccount.email}
                </a>
              </Row>
            )}
            <Row label="Pays">{b.payee}</Row>
            <Row label="Raised">{formatNaira(b.raisedAmount)}</Row>
          </dl>
          <Link href={`/bills/${b.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-maroon-700 hover:underline">
            Open bill <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
          <div className="mt-4 grid grid-cols-2 items-start gap-2">
            <VerifyBillForm billId={b.id} />
            <RemoveBillForm billId={b.id} />
          </div>
        </li>
      ))}
      </ul>
    </>
  );
}

function PayoutQueue({ bills, now }: { bills: Awaited<ReturnType<typeof adminQueues>>["toPayOut"]; now: number }) {
  if (!bills.length) return <EmptyPanel icon={Banknote} title="No payouts due" text="Fully funded bills will appear here, ready to be paid to the payee." />;
  return (
    <>
      <p className="text-sm text-ink-500">Transfer the funds to the payee first, then record the bank reference here.</p>
      <ul className="mt-4 space-y-4">
      {bills.map((b) => (
        <li key={b.id} className={card}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gold-600">Funded {b.fundedAt ? formatRelative(b.fundedAt, now) : ""}</p>
              <h2 className="mt-1 font-serif text-lg font-semibold text-ink-900">{b.title}</h2>
              <p className="text-sm text-ink-500">For {b.owner.name}</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold tabular-nums text-ink-900">{formatNaira(b.raisedAmount)}</p>
          </div>
          <dl className="mt-4 space-y-1.5 rounded-2xl bg-cream-50 p-3.5 text-sm">
            <Row label="Pay to">{b.payee}</Row>
            <Row label="Supporters">{b.contributorCount}</Row>
            <Row label="Verified">{b.owner.verified ? "Yes" : "No — verify before paying"}</Row>
          </dl>
          <div className="mt-4">
            {b.owner.verified ? (
              <PayoutForm billId={b.id} amount={b.raisedAmount} payee={b.payee} />
            ) : (
              <Link
                href="/admin?tab=verify"
                className="flex h-11 items-center justify-center rounded-xl border border-maroon-700/30 text-sm font-semibold text-maroon-700 hover:bg-cream-100"
              >
                Verify this bill first
              </Link>
            )}
          </div>
        </li>
      ))}
      </ul>
    </>
  );
}

function ReviewQueue({ payments }: { payments: Awaited<ReturnType<typeof adminQueues>>["inReview"] }) {
  if (!payments.length) return <EmptyPanel icon={ShieldAlert} title="Nothing to review" text="Payments whose amount didn't match what Paystack reported would appear here." />;
  return (
    <>
      <p className="text-sm text-ink-500">
        These payments succeeded at Paystack but didn&apos;t match the expected amount, so they were <strong>not</strong> credited. Reconcile in
        the Paystack dashboard.
      </p>
      <ul className="mt-4 space-y-3">
      {payments.map((p) => (
        <li key={p.reference} className={card}>
          <p className="font-semibold text-ink-900">{p.billTitle}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Reference"><span className="font-mono">{p.reference}</span></Row>
            <Row label="Expected">{formatNaira(p.amount)}</Row>
            <Row label="Payer">{p.email}</Row>
            <Row label="Gateway">{p.gatewayMessage ?? "—"}</Row>
            <Row label="Started">{formatDate(p.createdAt)}</Row>
          </dl>
        </li>
      ))}
      </ul>
    </>
  );
}

const ACTION_LABEL: Record<AuditEntry["action"], string> = {
  verify_bill: "Verified",
  remove_bill: "Removed",
  record_payout: "Recorded payout for",
};

function AuditLog({ entries, now }: { entries: AuditEntry[]; now: number }) {
  if (!entries.length) return <EmptyPanel icon={ClipboardList} title="No admin actions yet" text="Every verification, removal and payout is logged here." />;
  return (
    <ol className="divide-y divide-cream-200 rounded-3xl border border-cream-200 bg-white">
      {entries.map((e) => (
        <li key={e.id} className="p-4 text-sm">
          <p className="text-ink-700">
            <span className="font-semibold text-ink-900">{e.adminEmail}</span> {ACTION_LABEL[e.action].toLowerCase()}{" "}
            <Link href={`/bills/${e.billId}`} className="font-semibold text-maroon-700 hover:underline">
              {e.billId}
            </Link>
          </p>
          {e.note && <p className="mt-1 text-xs text-ink-500">“{e.note}”</p>}
          <time dateTime={e.at} className="mt-1 block text-xs text-ink-400">
            {formatRelative(e.at, now)}
          </time>
        </li>
      ))}
    </ol>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 text-right break-words text-ink-900">{children}</dd>
    </div>
  );
}
