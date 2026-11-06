"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { PaymentGatewayError } from "@/server/payments/paystack";
import { cancelPlus, startPlusCheckout } from "@/server/payments/subscriptions";

export interface PlusFormState {
  error?: string;
  message?: string;
}

async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function subscribePlus(): Promise<PlusFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plus");
  let url: string;
  try {
    const result = await startPlusCheckout(user, `${await appUrl()}/plus/callback`);
    if (!result.ok) return { error: result.error };
    url = result.authorizationUrl;
  } catch (error) {
    if (error instanceof PaymentGatewayError) return { error: error.message };
    console.error("[plus] checkout failed", error);
    return { error: "Something went wrong starting your subscription. Please try again." };
  }
  // Paystack's checkout is an external URL; redirect() handles absolute URLs.
  redirect(url);
}

export async function cancelPlusAction(): Promise<PlusFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/plus");
  try {
    const result = await cancelPlus(user.id);
    refresh();
    return result.ok ? { message: "Your subscription won't renew. You keep Plus until the end of this period." } : { error: result.error };
  } catch (error) {
    if (error instanceof PaymentGatewayError) return { error: error.message };
    throw error;
  }
}
