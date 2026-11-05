import type { CategoryId } from "./categories";

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
  /** Set once Village has disbursed the funds to the payee. */
  completedAt?: string;
}

export type BillStatus = "open" | "funded" | "completed" | "expired";

export type PaymentStatus = "pending" | "success" | "failed" | "abandoned" | "review";

export interface Payment {
  reference: string;
  billId: string;
  /** Amount the contributor agreed to pay, in naira. */
  amount: Naira;
  email: string;
  displayName: string | null;
  status: PaymentStatus;
  provider: "paystack";
  createdAt: string;
  confirmedAt?: string;
  /** Raw gateway status / reason, kept for support and reconciliation. */
  gatewayMessage?: string;
}
