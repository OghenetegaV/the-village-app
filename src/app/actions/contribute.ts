"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { PaymentGatewayError } from "@/server/payments/paystack";
import { startContribution, type StartContributionResult } from "@/server/payments/service";

const ContributionSchema = z.object({
  billId: z.string().min(1).max(120),
  amount: z.number().int("Enter a whole naira amount.").positive("Enter an amount greater than ₦0."),
  email: z.email("Enter a valid email address for your receipt.").max(254),
  displayName: z.string().trim().max(60).nullable(),
});

export type ContributionInput = z.input<typeof ContributionSchema>;

async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function beginContribution(input: ContributionInput): Promise<StartContributionResult> {
  const parsed = ContributionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  try {
    return await startContribution({
      ...parsed.data,
      callbackUrl: `${await appUrl()}/payments/callback`,
    });
  } catch (error) {
    if (error instanceof PaymentGatewayError) return { ok: false, error: error.message };
    console.error("[contribute] failed to start checkout", error);
    return { ok: false, error: "Something went wrong while starting your payment. Please try again." };
  }
}
