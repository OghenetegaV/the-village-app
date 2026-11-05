"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { recordPayout, removeBill, verifyBill, type AdminResult } from "@/server/admin";
import { requireAdminAction } from "@/server/auth/admin";

export type AdminFormState = { ok?: boolean; message?: string; error?: string };

function toState(result: AdminResult): AdminFormState {
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error };
}

const billId = z.string().min(1).max(120);

export async function verifyBillAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminAction();
  const id = billId.safeParse(formData.get("billId"));
  if (!id.success) return { error: "Missing bill." };
  const result = await verifyBill(admin, id.data);
  refresh();
  return toState(result);
}

export async function removeBillAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminAction();
  const parsed = z
    .object({
      billId,
      reason: z.string().trim().min(10, "Give the owner a clear reason (at least 10 characters).").max(300),
    })
    .safeParse({ billId: formData.get("billId"), reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const result = await removeBill(admin, parsed.data.billId, parsed.data.reason);
  refresh();
  return toState(result);
}

export async function recordPayoutAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireAdminAction();
  const parsed = z
    .object({
      billId,
      reference: z
        .string()
        .trim()
        .min(6, "Enter the bank transfer reference (at least 6 characters).")
        .max(64)
        .regex(/^[A-Za-z0-9/_-]+$/, "Use only letters, numbers, / _ or -."),
    })
    .safeParse({ billId: formData.get("billId"), reference: formData.get("reference") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const result = await recordPayout(admin, parsed.data.billId, parsed.data.reference);
  refresh();
  return toState(result);
}
