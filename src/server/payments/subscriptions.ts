import "server-only";
import { randomBytes } from "node:crypto";
import type { PublicUser, Subscription } from "@/lib/types";
import { read, transaction, type DatabaseShape } from "../db/store";
import { notify } from "../notifications";
import { isPlusActive, subscriptionOf } from "../plans";
import {
  disableSubscription,
  fetchPlan,
  initializeSubscription,
  isPaystackConfigured,
  planCodeOf,
  verifySubscriptionCharge,
  type PaystackPlan,
  type PlanInterval,
  type VerifiedSubscriptionCharge,
} from "./paystack";

/**
 * VILLAGE Plus runs on a Paystack Plan (Dashboard → Products → Plans). Its code goes in
 * PAYSTACK_PLUS_PLAN_CODE; the price and billing interval are read from Paystack, so they're only
 * ever defined in one place.
 */
export function plusPlanCode(): string | null {
  return process.env.PAYSTACK_PLUS_PLAN_CODE || null;
}

export async function getPlusPlan(): Promise<PaystackPlan | null> {
  const code = plusPlanCode();
  if (!code || !isPaystackConfigured()) return null;
  try {
    return await fetchPlan(code);
  } catch (error) {
    console.error("[plus] could not load plan", error);
    return null;
  }
}

function addInterval(fromMs: number, interval: PlanInterval): number {
  const d = new Date(fromMs);
  switch (interval) {
    case "hourly":
      return fromMs + 60 * 60 * 1000;
    case "daily":
      return fromMs + 24 * 60 * 60 * 1000;
    case "weekly":
      return fromMs + 7 * 24 * 60 * 60 * 1000;
    case "monthly":
      return d.setUTCMonth(d.getUTCMonth() + 1);
    case "quarterly":
      return d.setUTCMonth(d.getUTCMonth() + 3);
    case "biannually":
      return d.setUTCMonth(d.getUTCMonth() + 6);
    case "annually":
      return d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
}

export type StartPlusResult = { ok: true; authorizationUrl: string } | { ok: false; error: string };

export async function startPlusCheckout(user: PublicUser, callbackUrl: string): Promise<StartPlusResult> {
  const plan = await getPlusPlan();
  if (!plan) return { ok: false, error: "VILLAGE Plus isn't available yet. Please check back soon." };

  const db = await read();
  const sub = subscriptionOf(db, user.id);
  if (sub?.status === "active" && isPlusActive(sub, Date.now())) return { ok: false, error: "You're already subscribed to VILLAGE Plus." };

  const reference = `vlp_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
  const checkout = await initializeSubscription({
    email: user.email,
    planCode: plan.plan_code,
    amountKobo: plan.amount,
    reference,
    callbackUrl,
    metadata: { purpose: "village_plus", user_id: user.id },
  });

  await transaction((d) => {
    d.subscriptionCheckouts.push({
      reference,
      userId: user.id,
      planCode: plan.plan_code,
      amountKobo: plan.amount,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  });
  return { ok: true, authorizationUrl: checkout.authorization_url };
}

/**
 * Applies one verified Plus charge (first payment or renewal) to a user. Idempotent: a reference
 * that has already been applied is ignored. Must run inside a transaction.
 */
function applyCharge(db: DatabaseShape, userId: string, charge: VerifiedSubscriptionCharge, plan: PaystackPlan): boolean {
  let sub = subscriptionOf(db, userId);
  if (sub?.appliedReferences.includes(charge.reference)) return false;

  const paidAt = charge.paid_at ? new Date(charge.paid_at).getTime() : Date.now();
  // Extend from whichever is later, so paying early never loses days.
  const base = sub && new Date(sub.currentPeriodEnd).getTime() > paidAt ? new Date(sub.currentPeriodEnd).getTime() : paidAt;
  const periodEnd = new Date(addInterval(base, plan.interval)).toISOString();
  const wasActive = isPlusActive(sub, Date.now());

  if (!sub) {
    sub = {
      userId,
      planCode: plan.plan_code,
      status: "active",
      currentPeriodEnd: periodEnd,
      appliedReferences: [],
      startedAt: new Date(paidAt).toISOString(),
    } satisfies Subscription;
    db.subscriptions.push(sub);
  } else {
    sub.status = "active";
    sub.currentPeriodEnd = periodEnd;
    sub.planCode = plan.plan_code;
  }
  sub.appliedReferences.push(charge.reference);
  if (charge.customer?.customer_code) sub.customerCode = charge.customer.customer_code;

  if (!wasActive) {
    notify(db, {
      userId,
      kind: "plus_activated",
      title: "Welcome to VILLAGE Plus",
      body: "Your extra fundraiser and contract slots are ready to use.",
      href: "/plus",
    });
  }
  return true;
}

export type PlusConfirmation = { state: "active"; periodEnd: string } | { state: "pending" } | { state: "failed"; reason: string } | { state: "not_found" };

/** Confirms a Plus checkout on return from Paystack. Only grants Plus after Paystack verifies the exact plan and amount. */
export async function confirmPlusCheckout(reference: string, userId: string): Promise<PlusConfirmation> {
  const db = await read();
  const checkout = db.subscriptionCheckouts.find((c) => c.reference === reference && c.userId === userId);
  if (!checkout) return { state: "not_found" };

  if (checkout.status === "pending") {
    const [charge, plan] = await Promise.all([verifySubscriptionCharge(reference), fetchPlan(checkout.planCode)]);
    if (charge.status === "success") {
      const matches = charge.amount === checkout.amountKobo && charge.currency === "NGN" && planCodeOf(charge) === checkout.planCode;
      await transaction((d) => {
        const c = d.subscriptionCheckouts.find((x) => x.reference === reference)!;
        if (c.status !== "pending") return;
        if (!matches) {
          c.status = "failed";
          return;
        }
        c.status = "success";
        applyCharge(d, userId, charge, plan);
      });
      if (!matches) return { state: "failed", reason: "We couldn't match this payment to the Plus plan. Our team has been notified." };
    } else if (charge.status === "failed" || charge.status === "abandoned" || charge.status === "reversed") {
      await transaction((d) => {
        const c = d.subscriptionCheckouts.find((x) => x.reference === reference)!;
        if (c.status === "pending") c.status = "failed";
      });
      return { state: "failed", reason: charge.gateway_response || "The payment was not completed." };
    } else {
      return { state: "pending" };
    }
  }

  const latest = await read();
  const c = latest.subscriptionCheckouts.find((x) => x.reference === reference)!;
  if (c.status === "failed") return { state: "failed", reason: "The payment was not completed." };
  const sub = subscriptionOf(latest, userId);
  return sub ? { state: "active", periodEnd: sub.currentPeriodEnd } : { state: "pending" };
}

/* ------------------------------------------------------------ Webhooks */

interface SubscriptionEventData {
  subscription_code?: string;
  email_token?: string;
  status?: string;
  plan?: { plan_code?: string };
  customer?: { email?: string; customer_code?: string };
  reference?: string;
}

function userIdForCustomer(db: DatabaseShape, customer?: { email?: string; customer_code?: string }): string | null {
  if (customer?.customer_code) {
    const sub = db.subscriptions.find((s) => s.customerCode === customer.customer_code);
    if (sub) return sub.userId;
  }
  const email = customer?.email?.toLowerCase();
  return email ? (db.users.find((u) => u.email === email)?.id ?? null) : null;
}

/**
 * Handles Paystack subscription events. Returns true if the event was a Plus event (handled), so
 * the webhook knows not to treat it as a bill payment.
 */
export async function handleSubscriptionEvent(event: string, data: SubscriptionEventData): Promise<boolean> {
  const code = plusPlanCode();
  if (!code) return false;

  if (event === "charge.success") {
    // Renewals arrive as charge.success with the plan attached. Re-verify with the API before trusting it.
    if (!data.reference || planCodeOf(data as VerifiedSubscriptionCharge) !== code) return false;
    const db = await read();
    // First payments are applied via their checkout (callback page); also apply here in case the payer never returns.
    const checkout = db.subscriptionCheckouts.find((c) => c.reference === data.reference);
    if (checkout) {
      await confirmPlusCheckout(checkout.reference, checkout.userId);
      return true;
    }
    const [charge, plan] = await Promise.all([verifySubscriptionCharge(data.reference), fetchPlan(code)]);
    if (charge.status !== "success" || charge.amount !== plan.amount || planCodeOf(charge) !== code) return true;
    await transaction((d) => {
      const userId = userIdForCustomer(d, charge.customer);
      if (userId) applyCharge(d, userId, charge, plan);
      else console.warn("[plus] renewal for unknown customer", charge.customer?.email);
    });
    return true;
  }

  if (event === "subscription.create" && data.plan?.plan_code === code) {
    await transaction((d) => {
      const userId = userIdForCustomer(d, data.customer);
      const sub = userId ? subscriptionOf(d, userId) : null;
      if (sub) {
        sub.subscriptionCode = data.subscription_code;
        sub.emailToken = data.email_token;
        if (data.customer?.customer_code) sub.customerCode = data.customer.customer_code;
      }
    });
    return true;
  }

  if ((event === "subscription.disable" || event === "subscription.not_renew") && data.subscription_code) {
    await transaction((d) => {
      const sub = d.subscriptions.find((s) => s.subscriptionCode === data.subscription_code);
      if (!sub) return;
      // Keep access until the paid period ends; daily reads treat it as expired after that.
      if (sub.status === "active") sub.status = "non_renewing";
    });
    return true;
  }

  return false;
}

/* --------------------------------------------------------------- Cancel */

export async function cancelPlus(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await read();
  const sub = subscriptionOf(db, userId);
  if (!sub || sub.status !== "active") return { ok: false, error: "You don't have an active subscription to cancel." };
  if (!sub.subscriptionCode || !sub.emailToken) {
    return { ok: false, error: "We're still setting up your subscription with Paystack. Please try again in a few minutes." };
  }
  await disableSubscription(sub.subscriptionCode, sub.emailToken);
  await transaction((d) => {
    const s = subscriptionOf(d, userId);
    if (s && s.status === "active") s.status = "non_renewing";
  });
  return { ok: true };
}
