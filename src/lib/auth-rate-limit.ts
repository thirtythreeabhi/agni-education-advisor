import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { authRateLimits } from "@/db/schema";

const WINDOW_MS = 15 * 60 * 1000;

export async function enforceAuthRateLimit(key: string, maxAttempts: number) {
  const now = new Date();
  const threshold = new Date(now.getTime() - WINDOW_MS);
  const db = getDb();
  const [row] = await db.insert(authRateLimits).values({ key, windowStartedAt: now, attempts: 1, updatedAt: now }).onConflictDoUpdate({
    target: authRateLimits.key,
    set: {
      attempts: sql`case when ${authRateLimits.windowStartedAt} < ${threshold} then 1 else ${authRateLimits.attempts} + 1 end`,
      windowStartedAt: sql`case when ${authRateLimits.windowStartedAt} < ${threshold} then ${now} else ${authRateLimits.windowStartedAt} end`,
      updatedAt: now,
    },
  }).returning({ attempts: authRateLimits.attempts, windowStartedAt: authRateLimits.windowStartedAt });
  if (row.attempts > maxAttempts) throw new Error("RATE_LIMITED");
}
