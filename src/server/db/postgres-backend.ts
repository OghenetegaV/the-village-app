import "server-only";
import postgres from "postgres";
import { normalize, seedState, type Backend, type DatabaseShape } from "./shape";

/**
 * Postgres backend (Supabase, Neon, RDS, local…). The app's state is one JSONB document in a
 * single row, and every write runs in a transaction holding that row's lock
 * (`SELECT … FOR UPDATE`). That makes read-check-write sequences — crediting a payment once,
 * enforcing posting limits, recording a payout — atomic across *all* server instances, which the
 * file backend can't do.
 *
 * It keeps the exact read()/transaction() contract the rest of the app already uses. As the data
 * grows, move hot collections (payments, messages) into their own tables behind the same API.
 */

type Sql = ReturnType<typeof postgres>;

const globalForPg = globalThis as unknown as { villageSql?: Sql; villageReady?: Promise<void> };

/**
 * Drops query-string options from the connection URL. Providers append extras — Vercel's Supabase
 * integration adds `?sslmode=require&supa=base-pooler.x` — and postgres.js would forward unknown
 * ones to the server, which rejects the connection. SSL is configured explicitly below instead.
 */
function connectionUrl(raw: string): { url: string; local: boolean } {
  const parsed = new URL(raw);
  parsed.search = "";
  return { url: parsed.toString(), local: ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) };
}

function client(raw: string): Sql {
  if (!globalForPg.villageSql) {
    const { url, local } = connectionUrl(raw);
    globalForPg.villageSql = postgres(url, {
      ssl: local ? false : "require",
      // Transaction poolers (Supabase on port 6543, Neon "-pooler", PgBouncer) don't support
      // prepared statements.
      prepare: false,
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
    });
  }
  return globalForPg.villageSql;
}

export function createPostgresBackend(url: string): Backend {
  const sql = client(url);

  // Create the table and seed it once per process; concurrent first requests share one promise.
  function ready() {
    globalForPg.villageReady ??= (async () => {
      await sql`
        create table if not exists village_state (
          id integer primary key,
          data jsonb not null,
          updated_at timestamptz not null default now()
        )`;
      // Lock the table to the app's own connection. Supabase publishes `public` tables through its
      // Data API under the browser-visible "anon" key; with RLS on and no policies (and grants
      // revoked) those API roles can't read anything. The app connects as the table owner, which
      // RLS doesn't restrict. The revoke is skipped on Postgres servers without Supabase's roles.
      await sql`alter table village_state enable row level security`;
      await sql`
        do $$
        begin
          if exists (select 1 from pg_roles where rolname = 'anon') then
            revoke all on table village_state from anon;
          end if;
          if exists (select 1 from pg_roles where rolname = 'authenticated') then
            revoke all on table village_state from authenticated;
          end if;
        end $$`;
      await sql`
        insert into village_state (id, data) values (1, ${sql.json(seedState() as never)})
        on conflict (id) do nothing`;
    })().catch((error) => {
      globalForPg.villageReady = undefined; // allow a retry on the next request
      throw error;
    });
    return globalForPg.villageReady;
  }

  return {
    async read() {
      await ready();
      const [row] = await sql<{ data: DatabaseShape }[]>`select data from village_state where id = 1`;
      return normalize(row?.data);
    },
    async transaction(fn) {
      await ready();
      // sql.begin's typings wrap the result in UnwrapPromiseArray; it's the callback's own value.
      return (await sql.begin(async (tx) => {
        const [row] = await tx<{ data: DatabaseShape }[]>`select data from village_state where id = 1 for update`;
        const data = normalize(row?.data);
        const value = await fn(data);
        await tx`update village_state set data = ${tx.json(data as never)}, updated_at = now() where id = 1`;
        return value;
      })) as Awaited<ReturnType<typeof fn>>;
    },
  };
}
