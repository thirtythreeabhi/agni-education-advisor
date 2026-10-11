import { describe, expect, it } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import { familyAuditEvents, familyEducationFinances, families, studentConsultations, students } from "./schema";

describe("family profile schema", () => {
  it("defines additive family and student tables", () => {
    expect([
      getTableName(families),
      getTableName(students),
      getTableName(familyEducationFinances),
      getTableName(studentConsultations),
      getTableName(familyAuditEvents),
    ]).toEqual(["families", "students", "family_education_finances", "student_consultations", "family_audit_events"]);
  });

  it("keeps finance state and student planning fields explicit", () => {
    expect(Object.keys(getTableColumns(familyEducationFinances))).toEqual(expect.arrayContaining([
      "annualBudgetMinor", "annualBudgetState", "educationSavingsInr", "educationSavingsState", "proposedLoanInr", "annualHouseholdIncomeInr", "fundingSourceState", "financialAidState",
    ]));
    expect(Object.keys(getTableColumns(students))).toEqual(expect.arrayContaining([
      "academicSummary", "desiredDegree", "specialization", "careerGoals", "preferredCountries", "preferredIntake",
    ]));
  });
});
