"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isCategoryId } from "@/lib/categories";
import { CATEGORY_COVERS } from "@/lib/covers";
import type { Bill } from "@/lib/types";
import { BILL_LIMITS } from "@/lib/bill-limits";
import { getCurrentUser } from "@/server/auth/session";
import { transaction } from "@/server/db/store";
import { billQuota } from "@/server/plans";

export interface PostBillState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
}


const DAY = 24 * 60 * 60 * 1000;

const BillSchema = z.object({
  category: z.string().refine(isCategoryId, "Choose a category."),
  title: z.string().trim().min(5, "Give your bill a short, clear title.").max(BILL_LIMITS.titleMax),
  totalAmount: z.coerce
    .number({ error: "Enter the bill amount." })
    .int("Enter a whole naira amount.")
    .min(BILL_LIMITS.minAmount, `The minimum bill is ₦${BILL_LIMITS.minAmount.toLocaleString("en-NG")}.`)
    .max(BILL_LIMITS.maxAmount, `The maximum bill is ₦${BILL_LIMITS.maxAmount.toLocaleString("en-NG")}.`),
  payee: z.string().trim().min(3, "Tell supporters who will be paid, e.g. the hospital or school.").max(100),
  summary: z.string().trim().min(20, "Write at least a sentence (20+ characters).").max(BILL_LIMITS.summaryMax),
  story: z
    .string()
    .trim()
    .min(BILL_LIMITS.storyMin, `Share a little more (at least ${BILL_LIMITS.storyMin} characters).`)
    .max(BILL_LIMITS.storyMax),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date you need it by."),
  allowsPartialPayments: z.enum(["yes", "no"]),
});

export async function postBill(_prev: PostBillState, formData: FormData): Promise<PostBillState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bills/new");
  if (user.role !== "beneficiary") return { error: "Only Beneficiary accounts can post bills." };

  const raw = Object.fromEntries(
    ["category", "title", "totalAmount", "payee", "summary", "story", "deadline", "allowsPartialPayments"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  raw.totalAmount = raw.totalAmount.replace(/\D/g, "");

  const parsed = BillSchema.safeParse(raw);
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  }

  // End of the chosen day in Nigeria (WAT, UTC+1).
  const deadline = new Date(`${raw.deadline}T23:59:59+01:00`);
  const now = Date.now();
  if (!fieldErrors.deadline) {
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() < now + DAY / 2) {
      fieldErrors.deadline = "Choose a date from tomorrow onwards.";
    } else if (deadline.getTime() > now + BILL_LIMITS.maxDays * DAY) {
      fieldErrors.deadline = `Bills can run for at most ${BILL_LIMITS.maxDays} days.`;
    }
  }
  if (!parsed.success || Object.keys(fieldErrors).length) return { fieldErrors, values: raw };

  const data = parsed.data;
  const category = data.category as Bill["category"];
  const covers = CATEGORY_COVERS[category];
  const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const id = `${slug || "bill"}-${randomBytes(3).toString("hex")}`;

  const blocked = await transaction((db) => {
    // Enforced inside the write lock so rapid double-submits can't exceed the weekly allowance.
    const quota = billQuota(db, user.id, now);
    if (!quota.allowed) return quota.reason;
    db.bills.push({
      id,
      ownerId: user.id,
      title: data.title,
      category,
      summary: data.summary,
      story: data.story,
      owner: { name: user.fullName, location: user.location ?? "Nigeria", verified: false },
      coverImageUrl: covers[Math.floor(Math.random() * covers.length)],
      payee: data.payee,
      totalAmount: data.totalAmount,
      raisedAmount: 0,
      contributorCount: 0,
      allowsPartialPayments: data.allowsPartialPayments === "yes",
      deadline: deadline.toISOString(),
      createdAt: new Date(now).toISOString(),
    });
    return null;
  });

  if (blocked) return { error: blocked, values: raw };
  redirect(`/bills/${id}`);
}
