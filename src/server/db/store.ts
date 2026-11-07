import "server-only";
import os from "node:os";
import path from "node:path";
import { createFileBackend } from "./file-backend";
import { databaseUrl, storageMode } from "./mode";
import { createPostgresBackend } from "./postgres-backend";
import type { Backend, DatabaseShape } from "./shape";

export type { DatabaseShape } from "./shape";

/**
 * The app's single data-access entry point. Everything above this (repositories, services,
 * pages) only uses read() and transaction(); the backend is chosen from the environment — see
 * ./mode.ts.
 */
let backend: Backend | null = null;

function getBackend(): Backend {
  if (backend) return backend;
  switch (storageMode()) {
    case "postgres":
      backend = createPostgresBackend(databaseUrl()!);
      break;
    case "ephemeral":
      // Serverless: the deployment folder is read-only; the temp folder is the only writable place.
      console.warn("[village] No DATABASE_URL — using temporary storage. Data will not persist; payments are disabled.");
      backend = createFileBackend(path.join(os.tmpdir(), "village-data"));
      break;
    default:
      backend = createFileBackend(process.env.VILLAGE_DATA_DIR ?? path.join(process.cwd(), ".data"));
  }
  return backend;
}

/** Reads a consistent snapshot of all data. */
export function read(): Promise<DatabaseShape> {
  return getBackend().read();
}

/**
 * Runs `fn` with exclusive access to the data and persists whatever it mutates. Read-check-write
 * sequences inside `fn` (crediting a payment once, enforcing limits) are atomic. Don't call
 * read()/transaction() from inside `fn`.
 */
export function transaction<T>(fn: (data: DatabaseShape) => T | Promise<T>): Promise<T> {
  return getBackend().transaction(fn);
}
