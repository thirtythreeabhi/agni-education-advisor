import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();

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
  careerGoals: optionalText,
  preferredCountries: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  preferredIntake: optionalText,
});

export const educationFinancesInputSchema = z.object({
  annualBudgetMinor: z.number().int().nonnegative().nullable().optional(),
  annualBudgetCurrency: z.string().trim().length(3).toUpperCase().nullable().optional(),
  annualBudgetState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  fundingSource: optionalText.nullable().optional(),
  fundingSourceState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  financialAidNeeded: z.boolean().nullable().optional(),
  financialAidState: z.enum(["confirmed", "unknown", "review"]).default("unknown"),
  notes: optionalText.nullable().optional(),
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
