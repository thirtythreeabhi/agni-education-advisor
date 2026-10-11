import { beforeEach, describe, expect, it, vi } from "vitest";

const recordCaseUpdateMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/service", () => ({ recordCaseUpdate: recordCaseUpdateMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/record_case_update", () => {
  beforeEach(() => { process.env.AGNI_CASE_FUNCTION_SECRET = "private-secret"; recordCaseUpdateMock.mockReset(); rateLimitMock.mockReset(); });

  it("returns a safe authorization error for an unverified profile update", async () => {
    recordCaseUpdateMock.mockRejectedValue(new Error("MEMORY_AUTH_REQUIRED"));
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "private-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890", memoryKey: "profile", category: "confirmed_profile", statement: "The profile is confirmed." }) }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Authorization required" });
  });
});
