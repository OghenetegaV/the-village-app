import "server-only";
import type { Bill, Payment } from "@/lib/types";
import { read } from "./db/store";

export async function listBills(): Promise<Bill[]> {
  const { bills } = await read();
  return bills;
}

export async function getBill(id: string): Promise<Bill | null> {
  const { bills } = await read();
  return bills.find((b) => b.id === id) ?? null;
}

export async function listBillsByOwner(userId: string): Promise<Bill[]> {
  const { bills } = await read();
  return bills.filter((b) => b.ownerId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A user's payments joined with the bill they went to, newest first. */
export async function listContributionsByUser(userId: string): Promise<{ payment: Payment; bill: Bill | undefined }[]> {
  const { payments, bills } = await read();
  return payments
    .filter((p) => p.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((payment) => ({ payment, bill: bills.find((b) => b.id === payment.billId) }));
}
