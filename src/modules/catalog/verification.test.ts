import { describe, expect, it } from "vitest";
import { canTransitionVerification } from "./verification";

describe("catalog verification workflow", () => {
  it("requires an in-review step before verification", () => {
    expect(canTransitionVerification("unverified", "verified")).toBe(false);
    expect(canTransitionVerification("unverified", "in_review")).toBe(true);
    expect(canTransitionVerification("in_review", "verified")).toBe(true);
  });

  it("allows stale or conflicting verified facts to return to review", () => {
    expect(canTransitionVerification("verified", "stale")).toBe(true);
    expect(canTransitionVerification("stale", "in_review")).toBe(true);
    expect(canTransitionVerification("conflicting", "in_review")).toBe(true);
  });
});
