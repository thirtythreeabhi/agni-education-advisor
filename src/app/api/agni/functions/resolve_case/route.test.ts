import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveCaseMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/service", () => ({ resolveCase: resolveCaseMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/resolve_case", () => {
  beforeEach(() => { process.env.AGNI_CASE_FUNCTION_SECRET = "private-secret"; process.env.AGNI_DEMO_CASE_FUNCTION_SECRET = "demo-secret"; resolveCaseMock.mockReset(); rateLimitMock.mockReset(); });

  it("does not allow a private secret to be used as a demo secret", async () => {
    resolveCaseMock.mockResolvedValue({ state: "resolved", authorization: "pending", nextQuestion: "Verify your identity." });
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "private-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890" }) }));
    expect(response.status).toBe(200);
    expect(resolveCaseMock).toHaveBeenCalledWith("guest", { caseToken: "opaque-case-token-123456789012345678901234567890" });
    expect(await response.json()).toMatchObject({ data: { authorization: "pending" } });
  });

  it("does not expose service error details", async () => {
    resolveCaseMock.mockRejectedValue(new Error("CASE_NOT_FOUND"));
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "demo-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890" }) }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: "Case is unavailable" });
  });
});
