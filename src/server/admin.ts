import "server-only";
import { randomUUID } from "node:crypto";
import { billStatus } from "@/lib/bills";
import type { AuditEntry, Bill, Payment, PublicUser, User } from "@/lib/types";
import { read, transaction, type DatabaseShape } from "./db/store";
import { notifyPayout, notifyRemoved, notifyVerified } from "./notifications";

export type AdminResult = { ok: true; message: string } | { ok: false; error: string };

function audit(db: DatabaseShape, admin: PublicUser, action: AuditEntry["action"], billId: string, note?: string) {
  db.auditLog.push({ id: randomUUID(), adminId: admin.id, adminEmail: admin.email, action, billId, note, at: new Date().toISOString() });
}

/* -------------------------------------------------------------- Queues */

export interface AdminQueues {
  toVerify: (Bill & { ownerAccount: Pick<User, "email" | "phone"> | null })[];
  toPayOut: Bill[];
  inReview: (Payment & { billTitle: string })[];
  recentAudit: AuditEntry[];
}

export async function adminQueues(now: number): Promise<AdminQueues> {
  const db = await read();
  const account = (id?: string) => {
    const u = id ? db.users.find((x) => x.id === id) : undefined;
    return u ? { email: u.email, phone: u.phone } : null;
  };
  return {
    // Unverified bills posted by members that are still live (open or funded).
    toVerify: db.bills
      .filter((b) => b.ownerId && !b.owner.verified && !b.removedAt && ["open", "funded"].includes(billStatus(b, now)))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((b) => ({ ...b, ownerAccount: account(b.ownerId) })),
    // Fully funded, not yet paid to the payee. Oldest first — they've waited longest.
    toPayOut: db.bills
      .filter((b) => billStatus(b, now) === "funded")
      .sort((a, b) => (a.fundedAt ?? a.createdAt).localeCompare(b.fundedAt ?? b.createdAt)),
    inReview: db.payments
      .filter((p) => p.status === "review")
      .map((p) => ({ ...p, billTitle: db.bills.find((b) => b.id === p.billId)?.title ?? "Unknown bill" })),
    recentAudit: [...db.auditLog].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15),
  };
}

/* ----------------------------------------------------------- Mutations */

export function verifyBill(admin: PublicUser, billId: string): Promise<AdminResult> {
  return transaction((db) => {
    const bill = db.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, error: "Bill not found." };
    if (bill.removedAt) return { ok: false, error: "This bill has been removed." };
    if (bill.owner.verified) return { ok: true, message: "Already verified." };
    bill.owner.verified = true;
    bill.verifiedAt = new Date().toISOString();
    audit(db, admin, "verify_bill", bill.id);
    notifyVerified(db, bill);
    return { ok: true, message: `Verified “${bill.title}”.` };
  });
}

export function removeBill(admin: PublicUser, billId: string, reason: string): Promise<AdminResult> {
  return transaction((db) => {
    const bill = db.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, error: "Bill not found." };
    if (bill.removedAt) return { ok: true, message: "Already removed." };
    if (bill.completedAt) return { ok: false, error: "A bill that has been paid out can't be removed." };
    bill.removedAt = new Date().toISOString();
    bill.removalReason = reason;
    audit(db, admin, "remove_bill", bill.id, reason);
    notifyRemoved(db, bill, reason);
    return { ok: true, message: `Removed “${bill.title}” from the feed.` };
  });
}

export function recordPayout(admin: PublicUser, billId: string, reference: string): Promise<AdminResult> {
  return transaction((db) => {
    const bill = db.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, error: "Bill not found." };
    // Re-check state inside the lock so a payout is never recorded twice or for an unfunded bill.
    const status = billStatus(bill, Date.now());
    if (status === "completed") return { ok: false, error: "A payout has already been recorded for this bill." };
    if (status !== "funded") return { ok: false, error: "Only fully funded bills can be paid out." };
    // Never release money for a member-posted bill whose invoice hasn't been checked.
    if (bill.ownerId && !bill.owner.verified) return { ok: false, error: "Verify this bill before paying it out." };
    bill.completedAt = new Date().toISOString();
    bill.payoutReference = reference;
    audit(db, admin, "record_payout", bill.id, reference);
    notifyPayout(db, bill);
    return { ok: true, message: `Payout recorded for “${bill.title}”.` };
  });
}
