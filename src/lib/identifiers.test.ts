import { describe, expect, it } from "vitest";
import { normalizeIdentifier, normalizePhone } from "./identifiers";

describe("credential identifiers", () => {
  it("normalizes email consistently", () => {
    expect(normalizeIdentifier("  Person@Example.COM ")).toEqual({ type: "email", value: "person@example.com" });
  });

  it("normalizes Indian phone input to E.164", () => {
    expect(normalizePhone("9876543210")).toBe("+919876543210");
  });

  it("accepts valid international phone input", () => {
    expect(normalizePhone("+14155552671")).toBe("+14155552671");
  });
});
