import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";
import { authenticateCaseFunction, rateLimitKey, type CaseFunctionMode } from "@/lib/case-function-auth";

export async function handleCaseFunction<T>(request: Request, path: string, schema: z.ZodType<T>, action: (mode: CaseFunctionMode, input: T) => Promise<unknown>) {
  const mode = authenticateCaseFunction(request.headers);
  if (!mode) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    await enforceAuthRateLimit(rateLimitKey(request.headers, path), mode === "demo" ? 300 : 120);
    const contentLength = request.headers.get("content-length");
    if (contentLength && Number(contentLength) > 32_000) return NextResponse.json({ ok: false, error: "Request too large" }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 32_000) return NextResponse.json({ ok: false, error: "Request too large" }, { status: 413 });
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, error: "Malformed JSON" }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await action(mode, parsed.data) }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "RATE_LIMITED") return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    if (message === "CASE_NOT_FOUND" || message === "CASE_EXPIRED" || message === "CASE_MODE_MISMATCH") return NextResponse.json({ ok: false, error: "Case is unavailable" }, { status: 404 });
    if (message === "MEMORY_AUTH_REQUIRED") return NextResponse.json({ ok: false, error: "Authorization required" }, { status: 403 });
    if (message === "PROGRAM_KEY_INVALID" || message === "PROGRAM_UNAVAILABLE") return NextResponse.json({ ok: false, error: "Program selection is unavailable" }, { status: 400 });
    console.error(`Agni case function failed: ${path}`);
    return NextResponse.json({ ok: false, error: "Unable to process the request" }, { status: 500 });
  }
}
