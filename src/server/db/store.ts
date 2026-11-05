import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AuditEntry, Bill, Notification, Payment, Session, User } from "@/lib/types";
import { createSeedBills } from "./seed";

/**
 * A small file-backed JSON store with serialized writes.
 *
 * It keeps the app self-contained for local development and single-instance deployments.
 * For multi-instance or serverless hosting, swap the implementation of `read`/`transaction`
 * for a real database (Postgres, etc.) — the repositories above it don't need to change.
 */
export interface DatabaseShape {
  bills: Bill[];
  payments: Payment[];
  users: User[];
  sessions: Session[];
  notifications: Notification[];
  auditLog: AuditEntry[];
}

const DATA_DIR = process.env.VILLAGE_DATA_DIR ?? path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "village-db.json");

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<DatabaseShape> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw) as Partial<DatabaseShape>;
    // Forward-compatible with data files created before a collection existed.
    return { bills: [], payments: [], users: [], sessions: [], notifications: [], auditLog: [], ...data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const seeded: DatabaseShape = {
      bills: createSeedBills(Date.now()),
      payments: [],
      users: [],
      sessions: [],
      notifications: [],
      auditLog: [],
    };
    await persist(seeded);
    return seeded;
  }
}

async function persist(data: DatabaseShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Reads a consistent snapshot (waits for in-flight writes). */
export function read(): Promise<DatabaseShape> {
  const result = queue.then(load);
  queue = result.catch(() => undefined);
  return result;
}

/**
 * Runs `fn` with exclusive access to the data and persists whatever it mutates.
 * Writes are serialized, so read-check-write sequences (e.g. crediting a payment once) are atomic
 * within this process.
 */
export function transaction<T>(fn: (data: DatabaseShape) => T | Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    const data = await load();
    const value = await fn(data);
    await persist(data);
    return value;
  });
  queue = result.catch(() => undefined);
  return result;
}
