import { describe, expect, it } from "vitest";
import { auditChanges, isMeaningfulAuditChange } from "./audit";

describe("family audit changes", () => {
  it("records only changed fields with before and after values", () => {
    const changes = auditChanges({ annualBudgetState: "unknown", annualBudgetMinor: 100 }, { annualBudgetState: "review", annualBudgetMinor: 100 });
    expect(changes).toEqual({ annualBudgetState: { from: "unknown", to: "review" } });
    expect(isMeaningfulAuditChange(changes)).toBe(true);
  });

  it("records a complete creation payload", () => {
    const changes = auditChanges(null, { name: "Sharma family" });
    expect(changes).toEqual({ name: "Sharma family" });
  });
});
