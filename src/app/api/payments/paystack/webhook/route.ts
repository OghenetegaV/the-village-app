import { isValidWebhookSignature, PaymentGatewayError, type VerifiedTransaction } from "@/server/payments/paystack";
import { confirmPayment } from "@/server/payments/service";

/**
 * Paystack webhook. Register this URL in the Paystack dashboard:
 *   https://<your-domain>/api/payments/paystack/webhook
 *
 * The callback page also confirms payments, but the webhook guarantees bills are credited even if
 * the contributor closes their browser before being redirected back.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    if (!isValidWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))) {
      return new Response("Invalid signature", { status: 401 });
    }
  } catch (error) {
    if (error instanceof PaymentGatewayError) return new Response(error.message, { status: 503 });
    throw error;
  }

  const event = JSON.parse(rawBody) as { event: string; data: VerifiedTransaction };

  if (event.event === "charge.success") {
    // The signature proves the event came from Paystack, but we still re-verify against the API so
    // there is exactly one code path that decides whether a bill gets credited.
    const result = await confirmPayment(event.data.reference);
    if (result.state === "not_found") {
      console.warn("[paystack-webhook] unknown reference", event.data.reference);
    }
  }

  // Always acknowledge quickly so Paystack doesn't retry events we've already handled.
  return new Response("ok", { status: 200 });
}
