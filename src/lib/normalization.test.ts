import { describe, expect, it } from "vitest";
import { normalizeExtractedFields } from "./normalization";

describe("financial extraction normalization", () => {
  it("marks an unmentioned numeric zero as review, not confirmed zero", () => {
    expect(normalizeExtractedFields({ education_savings_inr: { type: "number", value: 0 } })[0]).toMatchObject({ state: "review", normalizedValue: null });
  });

  it("preserves an explicitly stated zero", () => {
    expect(normalizeExtractedFields({ proposed_loan_inr: { type: "string", value: "zero" } })[0]).toMatchObject({ state: "confirmed", normalizedValue: 0 });
  });

  it("marks omitted fields as missing", () => {
    expect(normalizeExtractedFields({ annual_household_income_inr: { type: "number", value: null } })[0]).toMatchObject({ state: "missing", normalizedValue: null });
  });

  it("confirms positive financial values", () => {
    expect(normalizeExtractedFields({ education_savings_inr: { type: "number", value: 250000 } })[0]).toMatchObject({ state: "confirmed", normalizedValue: 250000 });
  });

  it("keeps conflicting repeated values in review", () => {
    const value = { education_savings_inr: [{ type: "number", value: 100000 }, { type: "number", value: 200000 }] };
    expect(normalizeExtractedFields(value)[0]).toMatchObject({ state: "review", normalizedValue: null });
  });

  it("treats extraction placeholders as missing", () => {
    expect(normalizeExtractedFields({ proposed_loan_inr: { type: "string", value: "not discussed" } })[0]).toMatchObject({ state: "missing", normalizedValue: null });
  });
});
