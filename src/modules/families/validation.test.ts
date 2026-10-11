import { describe, expect, it } from "vitest";
import { educationFinancesInputSchema, studentInputSchema } from "./validation";

describe("family domain validation", () => {
  it("defaults countries and unknown finance states", () => {
    expect(studentInputSchema.parse({ firstName: "Asha" }).preferredCountries).toEqual([]);
    expect(educationFinancesInputSchema.parse({})).toMatchObject({
      annualBudgetState: "unknown",
      educationSavingsState: "unknown",
      proposedLoanState: "unknown",
      annualHouseholdIncomeState: "unknown",
      fundingSourceState: "unknown",
      financialAidState: "unknown",
    });
  });

  it("rejects unsafe financial values and invalid currency", () => {
    expect(() => educationFinancesInputSchema.parse({ annualBudgetMinor: -1 })).toThrow();
    expect(() => educationFinancesInputSchema.parse({ annualBudgetCurrency: "US" })).toThrow();
    expect(() => educationFinancesInputSchema.parse({ educationSavingsInr: -1 })).toThrow();
    expect(() => educationFinancesInputSchema.parse({ educationSavingsInr: 100000, educationSavingsState: "unknown" })).toThrow(/Unknown/);
    expect(() => educationFinancesInputSchema.parse({ educationSavingsState: "confirmed" })).toThrow(/without an amount/);
    expect(educationFinancesInputSchema.parse({ educationSavingsInr: 100000, educationSavingsState: "confirmed" })).toMatchObject({ educationSavingsInr: 100000 });
  });

  it("keeps student academic and planning fields bounded", () => {
    expect(() => studentInputSchema.parse({ firstName: "", preferredCountries: ["x"] })).toThrow();
    expect(studentInputSchema.parse({ firstName: "Asha", desiredDegree: "Computer Science", preferredCountries: ["Canada", "India"] })).toMatchObject({ desiredDegree: "Computer Science" });
  });

  it("bounds free text and removes duplicate country preferences", () => {
    expect(() => studentInputSchema.parse({ firstName: "Asha", careerGoals: "x".repeat(2001) })).toThrow();
    expect(studentInputSchema.parse({ firstName: "Asha", preferredCountries: ["Canada", "Canada"] }).preferredCountries).toEqual(["Canada"]);
  });
});
