import { NextResponse } from "next/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/passwords";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";

const resetSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(12).max(128) });

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid reset request" }, { status: 400 }); }
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  try { await enforceAuthRateLimit(`password-reset-submit:${tokenHash}`, 10); }
  catch { return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 }); }
  const now = new Date();
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [token] = await tx.select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
      .limit(1);
    if (!token) return false;
    const passwordHash = await hashPassword(parsed.data.password);
    const claimed = await tx.update(passwordResetTokens).set({ usedAt: now })
      .where(and(eq(passwordResetTokens.id, token.id), isNull(passwordResetTokens.usedAt))).returning({ id: passwordResetTokens.id });
    if (!claimed.length) return false;
    await tx.update(users).set({ passwordHash, emailVerified: true, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: now }).where(eq(users.id, token.userId));
    return true;
  });
  if (!result) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
