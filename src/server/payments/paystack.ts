import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Paystack client (https://paystack.com/docs/api/transaction).
 * Amounts sent to / received from Paystack are in kobo (₦1 = 100 kobo).
 */

/** Overridable for staging proxies or a local mock gateway in end-to-end tests. */
const BASE_URL = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "gateway_error" | "network_error",
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new PaymentGatewayError(
      "Payments are not configured. Set PAYSTACK_SECRET_KEY in your environment.",
      "not_configured",
    );
  }
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof PaymentGatewayError) throw error;
    throw new PaymentGatewayError("Could not reach the payment provider. Please try again.", "network_error");
  }

  const body = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !body?.status) {
    throw new PaymentGatewayError(body?.message ?? `Payment provider error (${res.status}).`, "gateway_error");
  }
  return body.data;
}

export interface InitializeParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}

export async function initializeTransaction(params: InitializeParams) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: "NGN",
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
  });
}

export type PaystackTransactionStatus = "success" | "failed" | "abandoned" | "ongoing" | "pending" | "reversed" | "queued";

export interface VerifiedTransaction {
  reference: string;
  status: PaystackTransactionStatus;
  amount: number; // kobo
  currency: string;
  gateway_response: string;
  paid_at: string | null;
}

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Validates the `x-paystack-signature` header (HMAC-SHA512 of the raw body with the secret key). */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
