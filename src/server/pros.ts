import "server-only";
import { randomUUID } from "node:crypto";
import { formatNaira } from "@/lib/format";
import type { NigerianState } from "@/lib/nigeria";
import { getTrade, TRADES, type TradeId } from "@/lib/trades";
import type { Contract, ProProfile, RoomMessage } from "@/lib/types";
import { read, transaction, type DatabaseShape } from "./db/store";
import { notify } from "./notifications";
import { contractQuota, plusUserIds } from "./plans";

/* --------------------------------------------------------------- Profile */

export function proProfileOf(db: Pick<DatabaseShape, "pros">, userId: string): ProProfile | null {
  return db.pros.find((p) => p.userId === userId) ?? null;
}

export async function getProProfile(userId: string) {
  return proProfileOf(await read(), userId);
}

export async function upsertProProfile(
  userId: string,
  input: Pick<ProProfile, "trade" | "headline" | "state" | "yearsExperience" | "licenseNumber">,
): Promise<ProProfile> {
  return transaction((db) => {
    const now = new Date().toISOString();
    const existing = proProfileOf(db, userId);
    if (existing) {
      Object.assign(existing, input, { updatedAt: now });
      return existing;
    }
    const profile: ProProfile = { userId, ...input, createdAt: now, updatedAt: now };
    db.pros.push(profile);
    return profile;
  });
}

/* ----------------------------------------------------------------- Rooms */

export interface RoomSummary {
  trade: TradeId;
  members: number;
  openContracts: number;
  lastActivityAt: string | null;
}

export async function roomSummaries(): Promise<RoomSummary[]> {
  const db = await read();
  return TRADES.map((t) => {
    const msgs = db.roomMessages.filter((m) => m.trade === t.id && !m.deletedAt);
    const contracts = db.contracts.filter((c) => c.trade === t.id);
    const last = [...msgs.map((m) => m.createdAt), ...contracts.map((c) => c.createdAt)].sort().at(-1) ?? null;
    return {
      trade: t.id,
      members: db.pros.filter((p) => p.trade === t.id).length,
      openContracts: contracts.filter((c) => c.status === "open").length,
      lastActivityAt: last,
    };
  });
}

/** Public-to-colleagues author card. Never includes email or phone. */
export interface MemberCard {
  userId: string;
  name: string;
  headline: string;
  state: NigerianState;
  yearsExperience: number;
  hasLicense: boolean;
  plus: boolean;
}

function memberCard(db: DatabaseShape, userId: string, plus: Set<string>): MemberCard | null {
  const user = db.users.find((u) => u.id === userId);
  const pro = proProfileOf(db, userId);
  if (!user || !pro) return null;
  return {
    userId,
    name: user.fullName,
    headline: pro.headline,
    state: pro.state,
    yearsExperience: pro.yearsExperience,
    hasLicense: Boolean(pro.licenseNumber),
    plus: plus.has(userId),
  };
}

export class NotAMemberError extends Error {}

function assertMember(db: DatabaseShape, userId: string, trade: TradeId) {
  if (proProfileOf(db, userId)?.trade !== trade) throw new NotAMemberError();
}

export function isMember(db: DatabaseShape, userId: string, trade: TradeId) {
  return proProfileOf(db, userId)?.trade === trade;
}

/* -------------------------------------------------------------- Messages */

export interface MessageView {
  id: string;
  body: string | null; // null = removed
  createdAt: string;
  author: MemberCard | { userId: string; name: string; headline: null; plus: false };
}

export const MESSAGE_MAX = 1000;
const PAGE = 100;

export async function listMessages(trade: TradeId, opts: { after?: string } = {}): Promise<MessageView[]> {
  const db = await read();
  const plus = plusUserIds(db, Date.now());
  const msgs = db.roomMessages
    .filter((m) => m.trade === trade && (!opts.after || m.createdAt > opts.after))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-PAGE);
  return msgs.map((m) => toView(db, m, plus));
}

function toView(db: DatabaseShape, m: RoomMessage, plus: Set<string>): MessageView {
  const author = memberCard(db, m.userId, plus) ?? {
    userId: m.userId,
    name: db.users.find((u) => u.id === m.userId)?.fullName ?? "Former member",
    headline: null,
    plus: false as const,
  };
  return { id: m.id, body: m.deletedAt ? null : m.body, createdAt: m.createdAt, author };
}

export async function postMessage(userId: string, trade: TradeId, body: string): Promise<MessageView> {
  return transaction((db) => {
    assertMember(db, userId, trade);
    const msg: RoomMessage = { id: randomUUID(), trade, userId, body, createdAt: new Date().toISOString() };
    db.roomMessages.push(msg);
    return toView(db, msg, plusUserIds(db, Date.now()));
  });
}

/** Authors can remove their own messages; admins can remove any. Removal keeps a placeholder. */
export async function removeMessage(userId: string, messageId: string, asAdmin: boolean): Promise<boolean> {
  return transaction((db) => {
    const m = db.roomMessages.find((x) => x.id === messageId);
    if (!m || m.deletedAt || (m.userId !== userId && !asAdmin)) return false;
    m.deletedAt = new Date().toISOString();
    return true;
  });
}

/* ------------------------------------------------------------- Contracts */

export interface ContractView extends Omit<Contract, "applicants" | "awardedTo"> {
  poster: MemberCard | null;
  applicantCount: number;
  /** Viewer-specific fields — filled only for the people allowed to see them. */
  viewerHasApplied: boolean;
  viewerIsPoster: boolean;
  viewerIsAwardee: boolean;
  /** For the poster only: who applied, with contact details they consented to share. */
  applicants?: (MemberCard & { note: string | null; at: string; email: string; phone: string | null })[];
  /** For the awardee only: the poster's contact details. */
  posterContact?: { email: string; phone: string | null };
  awardedToName?: string;
  /** For the poster only. */
  awardedToId?: string;
}

export async function listContracts(trade: TradeId, viewerId: string): Promise<ContractView[]> {
  const db = await read();
  const plus = plusUserIds(db, Date.now());
  const rank = { open: 0, awarded: 1, closed: 2 } as const;
  return db.contracts
    .filter((c) => c.trade === trade)
    .sort((a, b) => rank[a.status] - rank[b.status] || b.createdAt.localeCompare(a.createdAt))
    .map((c) => {
      const isPoster = c.posterId === viewerId;
      const isAwardee = c.awardedTo === viewerId;
      const poster = db.users.find((u) => u.id === c.posterId);
      const view: ContractView = {
        id: c.id,
        trade: c.trade,
        posterId: c.posterId,
        title: c.title,
        description: c.description,
        state: c.state,
        budget: c.budget,
        startBy: c.startBy,
        status: c.status,
        createdAt: c.createdAt,
        poster: memberCard(db, c.posterId, plus),
        applicantCount: c.applicants.length,
        viewerHasApplied: c.applicants.some((a) => a.userId === viewerId),
        viewerIsPoster: isPoster,
        viewerIsAwardee: isAwardee,
        awardedToName: c.awardedTo ? db.users.find((u) => u.id === c.awardedTo)?.fullName : undefined,
      };
      if (isPoster) {
        view.awardedToId = c.awardedTo;
        view.applicants = c.applicants
          .map((a) => {
            const card = memberCard(db, a.userId, plus);
            const u = db.users.find((x) => x.id === a.userId);
            return card && u ? { ...card, note: a.note, at: a.at, email: u.email, phone: u.phone } : null;
          })
          .filter((x) => x !== null);
      }
      if (isAwardee && poster) view.posterContact = { email: poster.email, phone: poster.phone };
      return view;
    });
}

export type ContractResult = { ok: true; id?: string } | { ok: false; error: string };

export async function postContract(
  userId: string,
  input: Pick<Contract, "trade" | "title" | "description" | "state" | "budget" | "startBy">,
): Promise<ContractResult> {
  return transaction((db) => {
    if (!isMember(db, userId, input.trade)) return { ok: false, error: "Join this room before posting contracts." };
    // Checked inside the write lock, so quickly repeated posts can't slip past the weekly limit.
    const quota = contractQuota(db, userId, Date.now());
    if (!quota.allowed) return { ok: false, error: quota.reason! };
    const contract: Contract = { id: randomUUID(), posterId: userId, status: "open", applicants: [], createdAt: new Date().toISOString(), ...input };
    db.contracts.push(contract);
    return { ok: true, id: contract.id };
  });
}

export async function expressInterest(userId: string, contractId: string, note: string | null): Promise<ContractResult> {
  return transaction((db) => {
    const c = db.contracts.find((x) => x.id === contractId);
    if (!c) return { ok: false, error: "Contract not found." };
    if (!isMember(db, userId, c.trade)) return { ok: false, error: "Only members of this room can apply." };
    if (c.posterId === userId) return { ok: false, error: "You can't apply to your own contract." };
    if (c.status !== "open") return { ok: false, error: "This contract is no longer open." };
    if (c.applicants.some((a) => a.userId === userId)) return { ok: true };
    c.applicants.push({ userId, note, at: new Date().toISOString() });
    const name = db.users.find((u) => u.id === userId)?.fullName ?? "A colleague";
    notify(db, {
      userId: c.posterId,
      kind: "contract_interest",
      title: `${name} is interested in your contract`,
      body: `${c.title}${note ? ` — “${note.slice(0, 120)}”` : ""}`,
      href: `/community/rooms/${c.trade}?tab=contracts`,
    });
    return { ok: true };
  });
}

export async function withdrawInterest(userId: string, contractId: string): Promise<ContractResult> {
  return transaction((db) => {
    const c = db.contracts.find((x) => x.id === contractId);
    if (!c || c.status !== "open") return { ok: false, error: "This contract is no longer open." };
    c.applicants = c.applicants.filter((a) => a.userId !== userId);
    return { ok: true };
  });
}

export async function awardContract(posterId: string, contractId: string, applicantId: string): Promise<ContractResult> {
  return transaction((db) => {
    const c = db.contracts.find((x) => x.id === contractId);
    if (!c || c.posterId !== posterId) return { ok: false, error: "Contract not found." };
    if (c.status !== "open") return { ok: false, error: "This contract has already been awarded or closed." };
    if (!c.applicants.some((a) => a.userId === applicantId)) return { ok: false, error: "That person hasn't applied." };
    c.status = "awarded";
    c.awardedTo = applicantId;
    const poster = db.users.find((u) => u.id === posterId)?.fullName ?? "A colleague";
    notify(db, {
      userId: applicantId,
      kind: "contract_awarded",
      title: "You've been awarded a contract",
      body: `${poster} chose you for “${c.title}”${c.budget ? ` (${formatNaira(c.budget)})` : ""} in ${c.state}. Their contact details are on the contract.`,
      href: `/community/rooms/${c.trade}?tab=contracts`,
    });
    return { ok: true };
  });
}

export async function closeContract(posterId: string, contractId: string): Promise<ContractResult> {
  return transaction((db) => {
    const c = db.contracts.find((x) => x.id === contractId);
    if (!c || c.posterId !== posterId) return { ok: false, error: "Contract not found." };
    if (c.status === "open") c.status = "closed";
    return { ok: true };
  });
}

export function tradeLabel(id: TradeId) {
  return getTrade(id).label;
}
