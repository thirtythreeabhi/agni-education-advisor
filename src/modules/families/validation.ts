import { z } from "zod";

const optionalText = z.string().trim().min(1).max(2000).optional();

export const createFamilyInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

export const updateFamilyInputSchema = createFamilyInputSchema.partial();

export const studentInputSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: optionalText,
  currentGrade: optionalText,
  schoolName: optionalText,
  academicSummary: optionalText,
  desiredDegree: optionalText,
  specialization: optionalText,
  careerGoals: optionalText,
  preferredCountries: z.array(z.string().trim().min(2).max(100)).max(30).default([]).transform((countries) => [...new Set(countries)]),
  preferredIntake: optionalText,
});

export const educationFinancesInputSchema = z.object({
  annualBudgetMinor: z.number().int().nonnegative().nullable().optional(),
  annualBudgetCurrency: z.string().trim().length(3).toUpperCase().nullable().optional(),
  annualBudgetState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  educationSavingsInr: z.number().int().nonnegative().nullable().optional(),
  educationSavingsState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  proposedLoanInr: z.number().int().nonnegative().nullable().optional(),
  proposedLoanState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  annualHouseholdIncomeInr: z.number().int().nonnegative().nullable().optional(),
  annualHouseholdIncomeState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  fundingSource: optionalText.nullable().optional(),
  fundingSourceState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  financialAidNeeded: z.boolean().nullable().optional(),
  financialAidState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  notes: optionalText.nullable().optional(),
}).superRefine((values, ctx) => {
  for (const [amount, state, name] of [
    [values.annualBudgetMinor, values.annualBudgetState, "Annual budget"],
    [values.educationSavingsInr, values.educationSavingsState, "Education savings"],
    [values.proposedLoanInr, values.proposedLoanState, "Proposed loan"],
    [values.annualHouseholdIncomeInr, values.annualHouseholdIncomeState, "Annual household income"],
  ] as const) {
    if (amount !== null && amount !== undefined && state === "unknown") ctx.addIssue({ code: "custom", path: [name], message: `${name} cannot be marked Unknown when an amount is present.` });
    if ((amount === null || amount === undefined) && state === "confirmed") ctx.addIssue({ code: "custom", path: [name], message: `${name} cannot be Confirmed without an amount.` });
  }
});

export const consultationAssociationInputSchema = z.object({
  studentId: z.string().uuid(),
  consultationId: z.string().uuid(),
});

export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilyInputSchema>;
export type StudentInput = z.infer<typeof studentInputSchema>;
export type EducationFinancesInput = z.infer<typeof educationFinancesInputSchema>;
export type ConsultationAssociationInput = z.infer<typeof consultationAssociationInputSchema>;
