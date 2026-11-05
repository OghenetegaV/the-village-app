import type { CategoryId } from "./categories";
import type { Role } from "./roles";

/** All monetary values are whole Nigerian naira (₦). Convert to kobo only at the payment-provider boundary. */
export type Naira = number;

export interface BillOwner {
  name: string;
  /** Profile photo. When absent, an initials monogram is shown. */
  avatarUrl?: string;
  location: string;
  verified: boolean;
}

export interface Bill {
  id: string;
  title: string;
  category: CategoryId;
  /** One–two sentence summary shown on the swipe card. */
  summary: string;
  /** Full story shown on the details screen. Paragraphs separated by blank lines. */
  story: string;
  owner: BillOwner;
  /** Account that posted the bill. Absent for bills imported/seeded by Village. */
  ownerId?: string;
  coverImageUrl: string;
  /** Who ultimately gets paid, e.g. "Lagos University Teaching Hospital". */
  payee: string;
  totalAmount: Naira;
  raisedAmount: Naira;
  contributorCount: number;
  /** When false the bill can only be settled with a single, full payment of the outstanding balance. */
  allowsPartialPayments: boolean;
  deadline: string; // ISO date
  createdAt: string; // ISO date
  /** When the bill reached its total. */
  fundedAt?: string;
  /** Set once Village has disbursed the funds to the payee. */
  completedAt?: string;
  /** Bank/transfer reference recorded by the admin who made the payout. */
  payoutReference?: string;
  /** When an admin verified the bill's documents. */
  verifiedAt?: string;
  /** When an admin removed the bill, and why (shown to the owner). */
  removedAt?: string;
  removalReason?: string;
}

/** "removed" = taken down by a Village admin (e.g. failed verification). */
export type BillStatus = "open" | "funded" | "completed" | "expired" | "removed";

export type PaymentStatus = "pending" | "success" | "failed" | "abandoned" | "review";

export interface Payment {
  reference: string;
  billId: string;
  /** Amount the contributor agreed to pay, in naira. */
  amount: Naira;
  /** Account that made the payment. */
  userId?: string;
  email: string;
  displayName: string | null;
  status: PaymentStatus;
  provider: "paystack";
  createdAt: string;
  confirmedAt?: string;
  /** Raw gateway status / reason, kept for support and reconciliation. */
  gatewayMessage?: string;
  /** True when this payment brought the bill to fully funded. */
  completedBill?: boolean;
}

export interface User {
  id: string;
  role: Role;
  fullName: string;
  /** Lower-cased; unique. */
  email: string;
  /** E.164, e.g. +2348012345678. Required for beneficiaries. */
  phone: string | null;
  location: string | null;
  passwordHash: string;
  createdAt: string;
}

/** The parts of a user that are safe to hand to client components. */
export type PublicUser = Pick<User, "id" | "role" | "fullName" | "email" | "phone" | "location" | "createdAt">;

export interface Session {
  /** SHA-256 of the session token; the raw token only ever lives in the user's cookie. */
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export type NotificationKind =
  | "welcome"
  | "contribution_received"
  | "bill_funded"
  | "bill_verified"
  | "bill_removed"
  | "payout_made";

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** In-app path to open when the notification is tapped. */
  href: string;
  createdAt: string;
  readAt?: string;
}

/** Append-only record of every admin decision, for accountability. */
export interface AuditEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: "verify_bill" | "remove_bill" | "record_payout";
  billId: string;
  note?: string;
  at: string;
}
