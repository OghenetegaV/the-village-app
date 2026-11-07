import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { normalize, seedState, type Backend, type DatabaseShape } from "./shape";

/**
 * JSON file in `dir`, with writes serialized through an in-process queue. Correct for one
 * long-running server; not shared between serverless instances.
 */
export function createFileBackend(dir: string): Backend {
  const file = path.join(dir, "village-db.json");
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<DatabaseShape> {
    try {
      return normalize(JSON.parse(await fs.readFile(file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const seeded = seedState();
      await persist(seeded);
      return seeded;
    }
  }

  async function persist(data: DatabaseShape) {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, file);
  }

  return {
    read() {
      const result = queue.then(load);
      queue = result.catch(() => undefined);
      return result;
    },
    transaction(fn) {
      const result = queue.then(async () => {
        const data = await load();
        const value = await fn(data);
        await persist(data);
        return value;
      });
      queue = result.catch(() => undefined);
      return result;
    },
  };
}
