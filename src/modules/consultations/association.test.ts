import { describe, expect, it } from "vitest";
import { buildProfileProposals, mapExtractionField, mapFinanceField } from "./association";
import { AGNI_EXTRACTION_FIELDS } from "@/lib/agni-schema";

const student = { firstName: "Asha", lastName: null, currentGrade: "12", schoolName: null, academicSummary: null, desiredDegree: null, specialization: null, careerGoals: null, preferredCountries: [], preferredIntake: null } as never;

describe("consultation profile proposals", () => {
  it("keeps all nine Agni contract fields represented", () => {
    expect(AGNI_EXTRACTION_FIELDS).toHaveLength(9);
    expect(AGNI_EXTRACTION_FIELDS.filter((field) => mapExtractionField(field) || mapFinanceField(field))).toHaveLength(9);
  });

  it("maps a complete nine-field Agni extraction payload without dropping fields", () => {
    const extractions = AGNI_EXTRACTION_FIELDS.map((field, index) => ({ id: String(index), fieldName: field, normalizedValue: field.endsWith("_inr") ? 100000 : field, state: "confirmed" }));
    const proposals = buildProfileProposals(extractions, student, {});
    expect(proposals).toHaveLength(9);
    expect(proposals.every((proposal) => proposal.state !== "unmapped")).toBe(true);
    expect(proposals.map((proposal) => proposal.studentFieldName ?? proposal.familyFinanceFieldName)).toEqual(expect.arrayContaining(["academicSummary", "desiredDegree", "specialization", "preferredIntake", "preferredCountries", "careerGoals", "educationSavingsInr", "proposedLoanInr", "annualHouseholdIncomeInr"]));
  });

  it("maps known Agni field names and leaves unknown fields unmapped", () => {
    expect(mapExtractionField("degree_level")).toBe("desiredDegree");
    expect(mapExtractionField("academic_background")).toBe("academicSummary");
    expect(mapExtractionField("specialization")).toBe("specialization");
    expect(mapExtractionField("target_intake")).toBe("preferredIntake");
    expect(mapFinanceField("education_savings_inr")).toBe("educationSavingsInr");
    expect(mapFinanceField("proposed_loan_inr")).toBe("proposedLoanInr");
    expect(mapFinanceField("annual_household_income_inr")).toBe("annualHouseholdIncomeInr");
    expect(mapExtractionField("unknown_field")).toBeUndefined();
    expect(buildProfileProposals([{ id: "1", fieldName: "unknown_field", normalizedValue: "x", state: "confirmed" }], student)[0].state).toBe("unmapped");
  });

  it("preserves existing values by marking differences as conflicts", () => {
    const proposals = buildProfileProposals([
      { id: "1", fieldName: "first_name", normalizedValue: "Asha", state: "confirmed" },
      { id: "2", fieldName: "current_grade", normalizedValue: "11", state: "confirmed" },
      { id: "3", fieldName: "desired_degree", normalizedValue: "Computer Science", state: "confirmed" },
    ], student);
    expect(proposals[0].state).toBe("pending");
    expect(proposals[1].state).toBe("conflict");
    expect(proposals[2].state).toBe("pending");
  });

  it("keeps financial proposals reviewable without inventing missing values", () => {
    const proposals = buildProfileProposals([
      { id: "1", fieldName: "education_savings_inr", normalizedValue: 250000, state: "confirmed" },
      { id: "2", fieldName: "proposed_loan_inr", normalizedValue: null, state: "missing" },
    ], student, { educationSavingsInr: 100000 });
    expect(proposals[0]).toMatchObject({ familyFinanceFieldName: "educationSavingsInr", existingValue: 100000, state: "conflict" });
    expect(proposals[1]).toMatchObject({ familyFinanceFieldName: "proposedLoanInr", existingValue: null, state: "conflict" });
  });
});
