import { beforeEach, describe, expect, it, vi } from "vitest";

const createCaseMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/service", () => ({ createCase: createCaseMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/create_case", () => {
  beforeEach(() => { process.env.AGNI_CASE_FUNCTION_SECRET = "private-secret"; process.env.AGNI_DEMO_CASE_FUNCTION_SECRET = "demo-secret"; createCaseMock.mockReset(); rateLimitMock.mockReset(); });

  it("requires server-to-server authentication", async () => {
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(createCaseMock).not.toHaveBeenCalled();
  });

  it("validates input, identifies demo mode from the secret, and returns the opaque case result", async () => {
    createCaseMock.mockResolvedValue({ caseToken: "opaque-token", state: "provisional", authorization: "none" });
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "demo-secret" }, body: JSON.stringify({ familyName: "Singh", graduationYear: 2027 }) }));
    expect(response.status).toBe(200);
    expect(createCaseMock).toHaveBeenCalledWith("demo", { familyName: "Singh", graduationYear: 2027 });
    expect(await response.json()).toMatchObject({ ok: true, data: { caseToken: "opaque-token" } });
  });

  it("returns safe errors for malformed input and rate limits", async () => {
    rateLimitMock.mockRejectedValueOnce(new Error("RATE_LIMITED"));
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "private-secret" }, body: JSON.stringify({ unexpected: true }) }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: "Too many requests" });
  });
});
