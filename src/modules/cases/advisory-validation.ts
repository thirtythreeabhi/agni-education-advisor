import { z } from "zod";

const caseToken = z.string().trim().min(32).max(256);
const text = (max: number) => z.string().trim().min(1).max(max);
const money = z.number().int().nonnegative();

export const qualificationInputSchema = z.object({
  caseToken,
  degreeLevel: z.enum(["bachelor", "master"]).optional(),
  academicBackground: text(3000).optional(),
  grades: text(1000).optional(),
  specialization: text(240).optional(),
  careerObjectives: text(2000).optional(),
  countries: z.array(text(80)).max(20).optional(),
  intendedIntake: text(120).optional(),
  educationSavingsInr: money.optional(),
  potentialLoanInr: money.optional(),
  householdIncomeInr: money.optional(),
  languageDetails: text(1200).optional(),
  entranceRequirements: text(1200).optional(),
}).strict();

export const searchProgramsInputSchema = z.object({
  caseToken,
  degreeLevel: z.enum(["bachelor", "master"]).optional(),
  specialization: text(240).optional(),
  countries: z.array(text(80)).max(20).optional(),
  intendedIntake: text(120).optional(),
  query: text(240).optional(),
  maxResults: z.number().int().min(1).max(10).default(5),
}).strict();

export const saveRecommendationsInputSchema = z.object({
  caseToken,
  recommendations: z.array(z.object({
    programKey: text(300),
    rationale: text(2000),
    assessment: z.object({
      fit: z.enum(["strong_match", "possible_match", "needs_verification", "not_assessable"]),
      notes: z.array(text(500)).max(10).default([]),
    }).strict().optional(),
  }).strict()).min(1).max(10),
}).strict();

export type QualificationInput = z.infer<typeof qualificationInputSchema>;
export type SearchProgramsInput = z.infer<typeof searchProgramsInputSchema>;
export type SaveRecommendationsInput = z.infer<typeof saveRecommendationsInputSchema>;
