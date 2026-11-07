import "server-only";
import type {
  AuditEntry,
  Bill,
  Contract,
  Notification,
  Payment,
  ProProfile,
  RoomMessage,
  Session,
  Subscription,
  SubscriptionCheckout,
  User,
} from "@/lib/types";
import { createSeedBills } from "./seed";

export interface DatabaseShape {
  bills: Bill[];
  payments: Payment[];
  users: User[];
  sessions: Session[];
  notifications: Notification[];
  auditLog: AuditEntry[];
  pros: ProProfile[];
  roomMessages: RoomMessage[];
  contracts: Contract[];
  subscriptions: Subscription[];
  subscriptionCheckouts: SubscriptionCheckout[];
}

export function emptyCollections(): DatabaseShape {
  return {
    bills: [],
    payments: [],
    users: [],
    sessions: [],
    notifications: [],
    auditLog: [],
    pros: [],
    roomMessages: [],
    contracts: [],
    subscriptions: [],
    subscriptionCheckouts: [],
  };
}

/** Fills in collections added after the data was first written. */
export function normalize(data: Partial<DatabaseShape> | null | undefined): DatabaseShape {
  return { ...emptyCollections(), ...(data ?? {}) };
}

/** First-run contents: demo bills with deadlines relative to now. */
export function seedState(): DatabaseShape {
  return { ...emptyCollections(), bills: createSeedBills(Date.now()) };
}

/** The operations every storage backend provides. */
export interface Backend {
  read(): Promise<DatabaseShape>;
  transaction<T>(fn: (data: DatabaseShape) => T | Promise<T>): Promise<T>;
}
