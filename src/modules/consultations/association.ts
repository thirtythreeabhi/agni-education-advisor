import type { Student } from "@/db/schema";

export type StudentProfileField = "firstName" | "lastName" | "currentGrade" | "schoolName" | "academicSummary" | "desiredDegree" | "specialization" | "careerGoals" | "preferredCountries" | "preferredIntake";
export type FamilyFinanceField = "educationSavingsInr" | "proposedLoanInr" | "annualHouseholdIncomeInr";

const fieldMap: Record<string, StudentProfileField> = {
  first_name: "firstName",
  student_first_name: "firstName",
  last_name: "lastName",
  student_last_name: "lastName",
  current_grade: "currentGrade",
  grade: "currentGrade",
  school_name: "schoolName",
  school: "schoolName",
  academic_summary: "academicSummary",
  academic_background: "academicSummary",
  academic_history: "academicSummary",
  academics: "academicSummary",
  desired_degree: "desiredDegree",
  degree_level: "desiredDegree",
  target_degree: "desiredDegree",
  specialization: "specialization",
  career_goals: "careerGoals",
  career_goal: "careerGoals",
  preferred_countries: "preferredCountries",
  target_countries: "preferredCountries",
  preferred_intake: "preferredIntake",
  intake: "preferredIntake",
  target_intake: "preferredIntake",
};

const financeFieldMap: Record<string, FamilyFinanceField> = {
  education_savings_inr: "educationSavingsInr",
  proposed_loan_inr: "proposedLoanInr",
  annual_household_income_inr: "annualHouseholdIncomeInr",
};

export function mapExtractionField(fieldName: string) {
  return fieldMap[fieldName.toLowerCase()];
}

export function mapFinanceField(fieldName: string) { return financeFieldMap[fieldName.toLowerCase()]; }

function equalValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildProfileProposals(extractions: Array<{ id: string; fieldName: string; normalizedValue: unknown; state: string }>, student: Student, finances?: Record<string, unknown> | null) {
  return extractions.map((extraction) => {
    const studentFieldName = mapExtractionField(extraction.fieldName);
    const familyFinanceFieldName = mapFinanceField(extraction.fieldName);
    const existingValue = studentFieldName ? student[studentFieldName] : familyFinanceFieldName ? finances?.[familyFinanceFieldName] ?? null : null;
    const proposedValue = extraction.normalizedValue;
    const state = !studentFieldName && !familyFinanceFieldName
      ? "unmapped" as const
      : proposedValue === null || extraction.state !== "confirmed"
        ? "conflict" as const
        : !equalValue(existingValue, null) && !equalValue(existingValue, proposedValue)
          ? "conflict" as const
          : "pending" as const;
    return { extractionId: extraction.id, fieldName: extraction.fieldName, studentFieldName: studentFieldName ?? null, familyFinanceFieldName: familyFinanceFieldName ?? null, proposedValue, existingValue, state };
  });
}

export function isProfileField(value: string): value is StudentProfileField {
  return Object.values(fieldMap).includes(value as StudentProfileField);
}
