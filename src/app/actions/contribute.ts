"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { PaymentGatewayError } from "@/server/payments/paystack";
import { startContribution, type StartContributionResult } from "@/server/payments/service";

const ContributionSchema = z.object({
  billId: z.string().min(1).max(120),
  amount: z.number().int("Enter a whole naira amount.").positive("Enter an amount greater than ₦0."),
  anonymous: z.boolean(),
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
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in to contribute." };

  const parsed = ContributionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  try {
    return await startContribution({
      userId: user.id,
      billId: parsed.data.billId,
      amount: parsed.data.amount,
      // The receipt always goes to the account's email; the name shown to the beneficiary is optional.
      email: user.email,
      displayName: parsed.data.anonymous ? null : user.fullName,
      callbackUrl: `${await appUrl()}/payments/callback`,
    });
  } catch (error) {
    if (error instanceof PaymentGatewayError) return { ok: false, error: error.message };
    console.error("[contribute] failed to start checkout", error);
    return { ok: false, error: "Something went wrong while starting your payment. Please try again." };
  }
}
