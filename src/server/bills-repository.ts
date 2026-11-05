import "server-only";
import type { Bill } from "@/lib/types";
import { read } from "./db/store";

export async function listBills(): Promise<Bill[]> {
  const { bills } = await read();
  return bills;
}

export async function getBill(id: string): Promise<Bill | null> {
  const { bills } = await read();
  return bills.find((b) => b.id === id) ?? null;
}
