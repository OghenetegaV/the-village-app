import "server-only";
import { randomBytes } from "node:crypto";
import { validateContribution } from "@/lib/bills";
import type { Bill, Payment, PaymentStatus } from "@/lib/types";
import { read, transaction } from "../db/store";
import { initializeTransaction, verifyTransaction, type VerifiedTransaction } from "./paystack";

export interface StartContributionInput {
  billId: string;
  amount: number;
  email: string;
  displayName: string | null;
  callbackUrl: string;
}

export type StartContributionResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string };

/**
 * Validates the contribution against the latest bill state, records a *pending* payment and
 * opens a Paystack checkout. Nothing about the bill changes here.
 */
export async function startContribution(input: StartContributionInput): Promise<StartContributionResult> {
  const now = Date.now();
  const { bills } = await read();
  const bill = bills.find((b) => b.id === input.billId);
  if (!bill) return { ok: false, error: "This bill could not be found." };

  const problem = validateContribution(bill, input.amount, now);
  if (problem) return { ok: false, error: problem };

  const reference = `vlg_${now.toString(36)}_${randomBytes(6).toString("hex")}`;

  const checkout = await initializeTransaction({
    email: input.email,
    amountKobo: input.amount * 100,
    reference,
    callbackUrl: input.callbackUrl,
    metadata: {
      bill_id: bill.id,
      bill_title: bill.title,
      contributor_name: input.displayName ?? "Anonymous",
      custom_fields: [
        { display_name: "Bill", variable_name: "bill", value: bill.title },
        { display_name: "Beneficiary", variable_name: "beneficiary", value: bill.owner.name },
      ],
    },
  });

  await transaction((db) => {
    db.payments.push({
      reference,
      billId: bill.id,
      amount: input.amount,
      email: input.email,
      displayName: input.displayName,
      status: "pending",
      provider: "paystack",
      createdAt: new Date(now).toISOString(),
    });
  });

  return { ok: true, authorizationUrl: checkout.authorization_url, reference };
}

export type ConfirmationResult =
  | { state: "success"; payment: Payment; bill: Bill }
  | { state: "pending"; payment: Payment; bill: Bill }
  | { state: "failed"; payment: Payment; bill: Bill; reason: string }
  | { state: "not_found" };

const TERMINAL: PaymentStatus[] = ["success", "failed", "abandoned", "review"];

/**
 * Confirms a payment with Paystack and — only if Paystack reports it as successful for the exact
 * amount and currency we expected — credits the bill. Safe to call repeatedly and concurrently
 * (callback page + webhook): a payment is credited at most once.
 */
export async function confirmPayment(reference: string): Promise<ConfirmationResult> {
  const snapshot = await read();
  const existing = snapshot.payments.find((p) => p.reference === reference);
  if (!existing) return { state: "not_found" };

  if (!TERMINAL.includes(existing.status)) {
    const verified = await verifyTransaction(reference);
    await transaction((db) => applyVerification(db, reference, verified));
  }

  const { payments, bills } = await read();
  const payment = payments.find((p) => p.reference === reference)!;
  const bill = bills.find((b) => b.id === payment.billId)!;

  switch (payment.status) {
    case "success":
      return { state: "success", payment, bill };
    case "pending":
      return { state: "pending", payment, bill };
    case "review":
      return {
        state: "failed",
        payment,
        bill,
        reason: "We couldn't match this payment to your contribution. Our team has been notified and will reach out.",
      };
    default:
      return { state: "failed", payment, bill, reason: payment.gatewayMessage || "The payment was not completed." };
  }
}

function applyVerification(
  db: { bills: Bill[]; payments: Payment[] },
  reference: string,
  verified: VerifiedTransaction,
) {
  const payment = db.payments.find((p) => p.reference === reference);
  // Re-check inside the lock: another request may have finished this payment already.
  if (!payment || TERMINAL.includes(payment.status)) return;

  payment.gatewayMessage = verified.gateway_response;

  if (verified.status === "success") {
    const amountMatches = verified.amount === payment.amount * 100 && verified.currency === "NGN";
    if (!amountMatches) {
      payment.status = "review";
      return;
    }
    const bill = db.bills.find((b) => b.id === payment.billId);
    if (!bill) {
      payment.status = "review";
      return;
    }
    bill.raisedAmount += payment.amount;
    bill.contributorCount += 1;
    payment.status = "success";
    payment.confirmedAt = verified.paid_at ?? new Date().toISOString();
    return;
  }

  if (verified.status === "failed" || verified.status === "reversed") payment.status = "failed";
  else if (verified.status === "abandoned") payment.status = "abandoned";
  // "ongoing" | "pending" | "queued" stay pending; the webhook or a later check will settle them.
}
