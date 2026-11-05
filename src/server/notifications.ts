import "server-only";
import { randomUUID } from "node:crypto";
import { formatNaira } from "@/lib/format";
import type { Bill, Notification, NotificationKind } from "@/lib/types";
import { read, transaction, type DatabaseShape } from "./db/store";

/**
 * Queues a notification inside an existing transaction, so the notification and the event that
 * caused it are persisted together (never one without the other).
 */
export function notify(
  db: DatabaseShape,
  n: { userId: string; kind: NotificationKind; title: string; body: string; href: string },
) {
  db.notifications.push({ id: randomUUID(), createdAt: new Date().toISOString(), ...n });
}

/** Distinct user ids with a confirmed contribution to the bill. */
function contributorIds(db: DatabaseShape, billId: string): string[] {
  return [...new Set(db.payments.filter((p) => p.billId === billId && p.status === "success" && p.userId).map((p) => p.userId!))];
}

/** Notifications for a newly credited contribution (called from the payment service). */
export function notifyContribution(db: DatabaseShape, bill: Bill, amount: number, contributorName: string | null) {
  if (!bill.ownerId) return;
  notify(db, {
    userId: bill.ownerId,
    kind: "contribution_received",
    title: `${contributorName ?? "An anonymous supporter"} contributed ${formatNaira(amount)}`,
    body: (() => {
      const left = Math.max(0, bill.totalAmount - bill.raisedAmount);
      return left > 0 ? `Towards ${bill.title}. ${formatNaira(left)} to go.` : `Towards ${bill.title} — that completes it!`;
    })(),
    href: `/bills/${bill.id}`,
  });
}

export function notifyFunded(db: DatabaseShape, bill: Bill, closerUserId: string | undefined) {
  if (bill.ownerId) {
    notify(db, {
      userId: bill.ownerId,
      kind: "bill_funded",
      title: "Your bill is fully funded! 🎉",
      body: `${bill.title} reached ${formatNaira(bill.totalAmount)}. We'll pay ${bill.payee} once it's verified.`,
      href: "/wallet",
    });
  }
  for (const userId of contributorIds(db, bill.id)) {
    if (userId === bill.ownerId) continue;
    notify(db, {
      userId,
      kind: "bill_funded",
      title: userId === closerUserId ? "You completed a bill!" : "A bill you helped is fully funded",
      body: `${bill.owner.name.split(" ")[0]}'s ${bill.title} is fully funded. Thank you for being part of it.`,
      href: `/bills/${bill.id}`,
    });
  }
}

export function notifyVerified(db: DatabaseShape, bill: Bill) {
  if (!bill.ownerId) return;
  notify(db, {
    userId: bill.ownerId,
    kind: "bill_verified",
    title: "Your bill is verified",
    body: `${bill.title} now shows a verified badge, which helps supporters trust it.`,
    href: `/bills/${bill.id}`,
  });
}

export function notifyRemoved(db: DatabaseShape, bill: Bill, reason: string) {
  if (!bill.ownerId) return;
  notify(db, {
    userId: bill.ownerId,
    kind: "bill_removed",
    title: "Your bill was removed",
    body: `${bill.title}: ${reason}`,
    href: `/bills/${bill.id}`,
  });
}

export function notifyPayout(db: DatabaseShape, bill: Bill) {
  if (bill.ownerId) {
    notify(db, {
      userId: bill.ownerId,
      kind: "payout_made",
      title: `${formatNaira(bill.raisedAmount)} paid to ${bill.payee}`,
      body: `Your bill "${bill.title}" has been paid. Thank your supporters!`,
      href: "/wallet",
    });
  }
  for (const userId of contributorIds(db, bill.id)) {
    if (userId === bill.ownerId) continue;
    notify(db, {
      userId,
      kind: "payout_made",
      title: "Your help paid a bill",
      body: `${bill.owner.name.split(" ")[0]}'s ${bill.title} was paid to ${bill.payee}.`,
      href: `/bills/${bill.id}`,
    });
  }
}

/* --------------------------------------------------------------- Reads */

export async function listNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const { notifications } = await read();
  return notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function unreadCount(userId: string): Promise<number> {
  const { notifications } = await read();
  return notifications.filter((n) => n.userId === userId && !n.readAt).length;
}

/* -------------------------------------------------------------- Writes */

/** Marks one notification read and returns its link — only if it belongs to `userId`. */
export async function markRead(userId: string, id: string): Promise<string | null> {
  return transaction((db) => {
    const n = db.notifications.find((x) => x.id === id && x.userId === userId);
    if (!n) return null;
    n.readAt ??= new Date().toISOString();
    return n.href;
  });
}

export async function markAllRead(userId: string) {
  await transaction((db) => {
    const now = new Date().toISOString();
    for (const n of db.notifications) if (n.userId === userId && !n.readAt) n.readAt = now;
  });
}
