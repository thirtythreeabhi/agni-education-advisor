import { timingSafeEqual } from "node:crypto";

export function hasValidAgniSecret(headers: Headers) {
  const headerName = process.env.AGNI_WEBHOOK_HEADER_NAME ?? "x-agni-webhook-secret";
  const configured = process.env.AGNI_WEBHOOK_SECRET;
  const received = headers.get(headerName);
  if (!configured || !received) return false;
  const expected = Buffer.from(configured, "utf8");
  const actual = Buffer.from(received, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const sensitiveKey = /(recording|audio).*(url|uri|ref|reference)|(^|_)(token|access_token|signature|sig)($|_)/i;
const sensitiveUrl = /^https?:\/\/[^\s]+[?&](token|access_token|signature|sig)=/i;

/** Removes recording/token material before anything reaches the database or logs. */
export function stripRecordingAccessTokens(value: unknown, key?: string): unknown {
  if (key && sensitiveKey.test(key)) return undefined;
  if (typeof value === "string" && sensitiveUrl.test(value)) return undefined;
  if (Array.isArray(value)) return value.map((item) => stripRecordingAccessTokens(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).flatMap(([childKey, childValue]) => {
      const clean = stripRecordingAccessTokens(childValue, childKey);
      return clean === undefined ? [] : [[childKey, clean]];
    }));
  }
  return value;
}
