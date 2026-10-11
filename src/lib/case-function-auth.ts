import { createHash, timingSafeEqual } from "node:crypto";

export type CaseFunctionMode = "demo" | "guest";

function equalSecret(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const actual = Buffer.from(received, "utf8");
  const configured = Buffer.from(expected, "utf8");
  return actual.length === configured.length && timingSafeEqual(actual, configured);
}

export function authenticateCaseFunction(headers: Headers): CaseFunctionMode | null {
  const name = process.env.AGNI_CASE_FUNCTION_HEADER_NAME ?? "x-agni-case-function-secret";
  const received = headers.get(name);
  if (equalSecret(received, process.env.AGNI_DEMO_CASE_FUNCTION_SECRET)) return "demo";
  if (equalSecret(received, process.env.AGNI_CASE_FUNCTION_SECRET)) return "guest";
  return null;
}

export function rateLimitKey(headers: Headers, path: string) {
  const name = process.env.AGNI_CASE_FUNCTION_HEADER_NAME ?? "x-agni-case-function-secret";
  return createHash("sha256").update(`agni-case:${path}:${headers.get(name) ?? "missing"}`).digest("hex");
}
