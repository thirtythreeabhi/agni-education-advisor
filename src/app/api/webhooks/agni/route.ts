import { NextResponse } from "next/server";
import { agniWebhookSchema } from "@/lib/agni-schema";
import { hasValidAgniSecret } from "@/lib/security";
import { ingestAgniWebhook } from "@/modules/consultations/service";

export const runtime = "nodejs";
const MAX_WEBHOOK_BYTES = 1_000_000;

export async function POST(request: Request) {
  if (!hasValidAgniSecret(request.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch { return NextResponse.json({ error: "Malformed JSON" }, { status: 400 }); }
  const parsed = agniWebhookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid webhook payload", issues: parsed.error.issues }, { status: 400 });
  try {
    const result = await ingestAgniWebhook(parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch {
    // Do not log provider payloads, transcripts, tokens, or database error details.
    console.error("Agni webhook processing failed");
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
