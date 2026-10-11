import { z } from "zod";

const textField = z.string().trim().min(1).max(240);

export const caseFactsSchema = z.object({
  familyName: textField.optional(),
  studentName: textField.optional(),
  schoolName: textField.optional(),
  currentGrade: textField.max(80).optional(),
  desiredDegree: textField.max(200).optional(),
  preferredIntake: textField.max(120).optional(),
  preferredCountry: textField.max(120).optional(),
  graduationYear: z.number().int().min(1900).max(2200).optional(),
}).strict();

export const createCaseInputSchema = z.object({
  callerName: textField.max(160).optional(),
  studentName: textField.max(160).optional(),
  familyName: textField.max(160).optional(),
  schoolName: textField.optional(),
  currentGrade: textField.max(80).optional(),
  desiredDegree: textField.max(200).optional(),
  preferredIntake: textField.max(120).optional(),
  preferredCountry: textField.max(120).optional(),
  graduationYear: z.number().int().min(1900).max(2200).optional(),
}).strict();

export const resolveCaseInputSchema = caseFactsSchema.extend({
  caseToken: z.string().trim().min(32).max(256).optional(),
}).strict();

export const getCaseContextInputSchema = z.object({
  caseToken: z.string().trim().min(32).max(256),
  detail: z.enum(["brief", "evidence", "all"]).default("brief"),
  categories: z.array(z.enum(["confirmed_profile", "caller_reported", "preference", "decision", "proposed_change", "unresolved_question", "promised_action", "follow_up_outcome", "discussed_university"])).max(9).optional(),
}).strict();

export const recordCaseUpdateInputSchema = z.object({
  caseToken: z.string().trim().min(32).max(256),
  memoryKey: z.string().trim().min(1).max(120),
  category: z.enum(["confirmed_profile", "caller_reported", "preference", "decision", "proposed_change", "unresolved_question", "promised_action", "follow_up_outcome", "discussed_university"]),
  statement: z.string().trim().min(1).max(1000),
  value: z.unknown().optional(),
  status: z.enum(["active", "resolved", "superseded", "rejected", "uncertain", "conflicted"]).default("active"),
  resolvesMemoryKey: z.string().trim().min(1).max(120).optional(),
}).strict();

export type CaseFacts = z.infer<typeof caseFactsSchema>;
