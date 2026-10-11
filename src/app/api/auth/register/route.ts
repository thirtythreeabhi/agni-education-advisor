import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { normalizeEmail, normalizePhone } from "@/lib/identifiers";
import { hashPassword } from "@/lib/passwords";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";

const registrationSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(12).max(128),
}).refine((value) => Boolean(value.email?.trim() || value.phone?.trim()), { message: "Email or phone is required" });

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid registration request" }, { status: 400 }); }
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration request" }, { status: 400 });
  const email = parsed.data.email?.trim() ? normalizeEmail(parsed.data.email) : null;
  const phone = parsed.data.phone?.trim() ? normalizePhone(parsed.data.phone) : null;
  if ((parsed.data.email && !email) || (parsed.data.phone && !phone)) return NextResponse.json({ error: "Invalid registration request" }, { status: 400 });
  const rateKey = createHash("sha256").update(`register:${email ?? phone ?? "invalid"}`).digest("hex");
  try {
    await enforceAuthRateLimit(rateKey, 5);
    const passwordHash = await hashPassword(parsed.data.password);
    await getDb().insert(users).values({ email, phone, passwordHash, role: "user" });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    // Keep duplicate identifiers indistinguishable from other registration failures.
    return NextResponse.json({ error: "Unable to create account" }, { status: 400 });
  }
}
