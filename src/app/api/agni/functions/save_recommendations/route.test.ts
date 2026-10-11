import { beforeEach, describe, expect, it, vi } from "vitest";

const saveRecommendationsMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/advisory-service", () => ({ saveRecommendations: saveRecommendationsMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/save_recommendations", () => {
  beforeEach(() => { process.env.AGNI_DEMO_CASE_FUNCTION_SECRET = "demo-secret"; saveRecommendationsMock.mockReset(); rateLimitMock.mockReset(); });

  it("accepts only opaque search result keys at the function boundary", async () => {
    saveRecommendationsMock.mockResolvedValue({ saved: [{ status: "saved" }] });
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "demo-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890", recommendations: [{ programKey: "search-result-key", rationale: "Matches the stated specialization." }] }) }));
    expect(response.status).toBe(200);
    expect(saveRecommendationsMock).toHaveBeenCalledWith("demo", { caseToken: "opaque-case-token-123456789012345678901234567890", recommendations: [{ programKey: "search-result-key", rationale: "Matches the stated specialization." }] });
  });
});
