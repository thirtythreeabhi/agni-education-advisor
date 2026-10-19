import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";
import { normalizeEmail } from "@/lib/identifiers";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";

const requestSchema = z.object({ email: z.string().email().max(320) });
const GENERIC_RESPONSE = { ok: true, message: "If an account matches, recovery instructions will be sent shortly." };

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json(GENERIC_RESPONSE); }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json(GENERIC_RESPONSE);
  const email = normalizeEmail(parsed.data.email);
  if (!email) return NextResponse.json(GENERIC_RESPONSE);
  const rateKey = createHash("sha256").update(`password-reset:${email}`).digest("hex");
  try {
    await enforceAuthRateLimit(rateKey, 3);
    const [user] = await getDb().select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    // Possession of the reset link verifies this recovery email during reset.
    if (!user?.email) return NextResponse.json(GENERIC_RESPONSE);

    const token = createPasswordResetToken();
    const db = getDb();
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash: token.tokenHash, expiresAt: token.expiresAt });
    try {
      await sendPasswordResetEmail(user.email, token.rawToken);
    } catch {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, token.tokenHash));
      // Keep delivery/configuration failures indistinguishable from unknown accounts.
      return NextResponse.json(GENERIC_RESPONSE);
    }
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") return NextResponse.json(GENERIC_RESPONSE);
    return NextResponse.json({ error: "Password recovery is temporarily unavailable." }, { status: 503 });
  }
}
