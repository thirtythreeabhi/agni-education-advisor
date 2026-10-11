import { describe, expect, it } from "vitest";
import { checkCatalogReadiness } from "./readiness";

const base = {
  academicYear: "2026-2027" as const,
  verificationStatus: "verified",
  verifiedAt: new Date("2026-01-11T00:00:00Z"),
  retrievedAt: new Date("2026-01-10T00:00:00Z"),
  effectiveTo: null,
  sourceUrl: "https://university.example/program",
  intakes: [{ intakeName: "Fall", startsOn: "2026-09-01", applicationDeadline: "2026-05-01" }],
  requirements: [{ requirementType: "language" as const, description: "Official language requirement" }],
  fees: [
    { feeType: "international_tuition" as const, amount: 1000, currency: "USD", isRequired: true },
    { feeType: "mandatory" as const, amount: 100, currency: "USD", isRequired: true },
  ],
};

describe("catalog readiness", () => {
  it("accepts complete, fresh, verified facts", () => {
    expect(checkCatalogReadiness(base, new Date("2026-02-01T00:00:00Z"))).toEqual({ ready: true, issues: [] });
  });

  it("rejects unverified or incomplete critical facts", () => {
    const result = checkCatalogReadiness({ ...base, verificationStatus: "unverified", verifiedAt: null, intakes: [], fees: [] }, new Date("2026-02-01T00:00:00Z"));
    expect(result.ready).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["unverified", "missing_verification_timestamp", "missing_current_intake_deadline", "incomplete_fees"]));
  });

  it("rejects stale evidence and expired revisions", () => {
    const result = checkCatalogReadiness({ ...base, retrievedAt: new Date("2024-01-01T00:00:00Z"), effectiveTo: "2025-12-31" }, new Date("2026-02-01T00:00:00Z"));
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["stale_source", "expired_effective_period"]));
  });

  it("rejects non-comparable or unusable required fees", () => {
    const result = checkCatalogReadiness({ ...base, fees: [{ feeType: "international_tuition", amount: 0, currency: "USD", isRequired: true }, { feeType: "mandatory", amount: 100, currency: "INR", isRequired: true }] }, new Date("2026-02-01T00:00:00Z"));
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["invalid_fee_amount", "fee_currency_mismatch"]));
  });
});
