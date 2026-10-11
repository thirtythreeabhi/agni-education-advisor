import { beforeEach, describe, expect, it, vi } from "vitest";

const searchProgramsMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/advisory-service", () => ({ searchPrograms: searchProgramsMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/search_programs", () => {
  beforeEach(() => { process.env.AGNI_CASE_FUNCTION_SECRET = "private-secret"; searchProgramsMock.mockReset(); rateLimitMock.mockReset(); });

  it("uses caller filters and returns source-backed results", async () => {
    searchProgramsMock.mockResolvedValue({ results: [{ programKey: "opaque", sources: [{ url: "https://university.example/program" }] }] });
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "private-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890", degreeLevel: "master", countries: ["Germany"] }) }));
    expect(response.status).toBe(200);
    expect(searchProgramsMock).toHaveBeenCalledWith("guest", { caseToken: "opaque-case-token-123456789012345678901234567890", degreeLevel: "master", countries: ["Germany"], maxResults: 5 });
  });
});
