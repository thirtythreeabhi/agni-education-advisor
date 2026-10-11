import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool?: Pool;
  db?: NodePgDatabase<typeof schema>;
  databaseUrl?: string;
};

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (globalForDb.db && globalForDb.databaseUrl === databaseUrl) return globalForDb.db;
  if (globalForDb.pool && globalForDb.databaseUrl !== databaseUrl) void globalForDb.pool.end();
  const pool = new Pool({
    connectionString: databaseUrl,
    // Keep the pool small: Vercel/Next.js may create several warm instances.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  globalForDb.pool = pool;
  globalForDb.databaseUrl = databaseUrl;
  globalForDb.db = drizzle(pool, { schema });
  return globalForDb.db;
}

export async function closeDb() {
  await globalForDb.pool?.end();
  globalForDb.pool = undefined;
  globalForDb.db = undefined;
  globalForDb.databaseUrl = undefined;
}
