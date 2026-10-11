import { beforeEach, describe, expect, it, vi } from "vitest";

const getCaseContextMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/service", () => ({ getCaseContext: getCaseContextMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/get_case_context", () => {
  beforeEach(() => { process.env.AGNI_DEMO_CASE_FUNCTION_SECRET = "demo-secret"; getCaseContextMock.mockReset(); rateLimitMock.mockReset(); });

  it("returns the compact brief through the authenticated contract", async () => {
    getCaseContextMock.mockResolvedValue({ state: "resolved", brief: { openQuestions: [] } });
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "demo-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890" }) }));
    expect(response.status).toBe(200);
    expect(getCaseContextMock).toHaveBeenCalledWith("demo", { caseToken: "opaque-case-token-123456789012345678901234567890", detail: "brief" });
    expect(await response.json()).toMatchObject({ ok: true, data: { state: "resolved" } });
  });
});
