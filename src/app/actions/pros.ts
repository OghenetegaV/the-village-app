"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isNigerianState, type NigerianState } from "@/lib/nigeria";
import { isTradeId, type TradeId } from "@/lib/trades";
import { isAdmin } from "@/server/auth/admin";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { getCurrentUser, safeNextPath } from "@/server/auth/session";
import {
  awardContract,
  closeContract,
  expressInterest,
  MESSAGE_MAX,
  NotAMemberError,
  postContract,
  postMessage,
  removeMessage,
  upsertProProfile,
  withdrawInterest,
  type MessageView,
} from "@/server/pros";

export interface ProFormState {
  error?: string;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
}

/* --------------------------------------------------------------- Profile */

const ProfileSchema = z.object({
  trade: z.string().refine(isTradeId, "Choose your trade."),
  headline: z.string().trim().min(5, "Describe what you do (at least 5 characters).").max(80),
  state: z.string().refine(isNigerianState, "Choose the state you work in."),
  yearsExperience: z.coerce.number({ error: "Enter your years of experience." }).int().min(0).max(60),
  licenseNumber: z.string().trim().max(40),
});

export async function saveProProfile(_prev: ProFormState, formData: FormData): Promise<ProFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pro");
  const raw = Object.fromEntries(["trade", "headline", "state", "yearsExperience", "licenseNumber"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values: raw };
  }
  const d = parsed.data;
  await upsertProProfile(user.id, {
    trade: d.trade as TradeId,
    headline: d.headline,
    state: d.state as NigerianState,
    yearsExperience: d.yearsExperience,
    licenseNumber: d.licenseNumber || null,
  });
  redirect(safeNextPath(formData.get("next"), `/community/rooms/${d.trade}`));
}

/* -------------------------------------------------------------- Messages */

export type SendResult = { ok: true; message: MessageView } | { ok: false; error: string };

export async function sendRoomMessage(trade: string, body: string): Promise<SendResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!isTradeId(trade)) return { ok: false, error: "Unknown room." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > MESSAGE_MAX) return { ok: false, error: `Messages can be up to ${MESSAGE_MAX} characters.` };
  if (!checkRateLimit(`msg:${user.id}`, 10, 60_000).allowed) {
    return { ok: false, error: "You're sending messages too quickly. Wait a moment and try again." };
  }
  try {
    return { ok: true, message: await postMessage(user.id, trade, text) };
  } catch (error) {
    if (error instanceof NotAMemberError) return { ok: false, error: "Only members of this room can post here." };
    throw error;
  }
}

export async function deleteRoomMessage(messageId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  return { ok: await removeMessage(user.id, messageId, isAdmin(user)) };
}

/* ------------------------------------------------------------- Contracts */

const ContractSchema = z.object({
  trade: z.string().refine(isTradeId),
  title: z.string().trim().min(5, "Give the job a short, clear title.").max(80),
  description: z.string().trim().min(20, "Describe the work (at least 20 characters).").max(1500),
  state: z.string().refine(isNigerianState, "Choose where the work is."),
  budget: z.string().transform((v) => v.replace(/\D/g, "")),
  startBy: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Choose a valid date."),
});

export async function postContractAction(_prev: ProFormState, formData: FormData): Promise<ProFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const raw = Object.fromEntries(["trade", "title", "description", "state", "budget", "startBy"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = ContractSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values: raw };
  }
  const d = parsed.data;
  const budget = d.budget ? Number(d.budget) : null;
  if (budget !== null && (budget < 1000 || budget > 100_000_000)) {
    return { fieldErrors: { budget: "Enter a budget between ₦1,000 and ₦100,000,000, or leave it blank." }, values: raw };
  }
  const result = await postContract(user.id, {
    trade: d.trade as TradeId,
    title: d.title,
    description: d.description,
    state: d.state as NigerianState,
    budget,
    startBy: d.startBy || null,
  });
  if (!result.ok) return { error: result.error, values: raw };
  refresh();
  return { message: "Contract posted. Colleagues in this room can now apply." };
}

async function contractAction(fn: (userId: string) => Promise<{ ok: boolean; error?: string }>): Promise<ProFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const result = await fn(user.id);
  refresh();
  return result.ok ? {} : { error: result.error };
}

export async function interestAction(_prev: ProFormState, formData: FormData): Promise<ProFormState> {
  const id = String(formData.get("contractId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  return contractAction((uid) => expressInterest(uid, id, note));
}

export async function withdrawAction(_prev: ProFormState, formData: FormData): Promise<ProFormState> {
  const id = String(formData.get("contractId") ?? "");
  return contractAction((uid) => withdrawInterest(uid, id));
}

export async function awardAction(_prev: ProFormState, formData: FormData): Promise<ProFormState> {
  const id = String(formData.get("contractId") ?? "");
  const applicant = String(formData.get("applicantId") ?? "");
  return contractAction((uid) => awardContract(uid, id, applicant));
}

export async function closeAction(_prev: ProFormState, formData: FormData): Promise<ProFormState> {
  const id = String(formData.get("contractId") ?? "");
  return contractAction((uid) => closeContract(uid, id));
}
