import { beforeEach, describe, expect, it, vi } from "vitest";

const qualifyStudentMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/modules/cases/advisory-service", () => ({ qualifyStudent: qualifyStudentMock }));
vi.mock("@/lib/auth-rate-limit", () => ({ enforceAuthRateLimit: rateLimitMock }));

import { POST } from "./route";

describe("POST /api/agni/functions/qualify_student", () => {
  beforeEach(() => { process.env.AGNI_DEMO_CASE_FUNCTION_SECRET = "demo-secret"; qualifyStudentMock.mockReset(); rateLimitMock.mockReset(); });

  it("records supplied qualification without requiring every field", async () => {
    qualifyStudentMock.mockResolvedValue({ missingInformation: ["grades"] });
    const response = await POST(new Request("http://localhost", { method: "POST", headers: { "x-agni-case-function-secret": "demo-secret" }, body: JSON.stringify({ caseToken: "opaque-case-token-123456789012345678901234567890", degreeLevel: "master", academicBackground: "Computer science" }) }));
    expect(response.status).toBe(200);
    expect(qualifyStudentMock).toHaveBeenCalledWith("demo", { caseToken: "opaque-case-token-123456789012345678901234567890", degreeLevel: "master", academicBackground: "Computer science" });
  });
});
