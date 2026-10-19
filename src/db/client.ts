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
  const parsedUrl = new URL(databaseUrl);
  const sslMode = parsedUrl.searchParams.get("sslmode");
  const pool = new Pool({
    // Use an explicit IPv4 address when the runtime has no usable IPv6 route.
    // Preserve the original hostname as TLS SNI for certificate validation.
    host: process.env.DATABASE_HOST_IPV4 ?? parsedUrl.hostname,
    port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.slice(1),
    ssl: sslMode && sslMode !== "disable" ? { servername: parsedUrl.hostname, rejectUnauthorized: true } : undefined,
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
