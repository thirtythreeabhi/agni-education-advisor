import { z } from "zod";

export const extractedFieldSchema = z.object({
  type: z.enum(["string", "number", "enum"]),
  value: z.unknown(),
});

// The nine fields currently emitted by the education-advisor Agni agent. The
// payload remains forward-compatible, but these names are the supported
// product contract and must stay aligned with proposal mappings.
export const AGNI_EXTRACTION_FIELDS = [
  "academic_background",
  "desired_degree",
  "specialization",
  "target_intake",
  "preferred_countries",
  "career_goals",
  "education_savings_inr",
  "proposed_loan_inr",
  "annual_household_income_inr",
] as const;

export const agniWebhookSchema = z.object({
  event: z.literal("call_completed"),
  agent_name: z.string().optional(),
  call_type: z.string().optional(),
  call_session: z.object({
    id: z.string().min(1),
    agent_id: z.string().optional(),
    status: z.string().optional(),
    duration_sec: z.number().int().nonnegative().optional(),
    disconnect_reason: z.string().optional(),
    post_call_analysis_result: z.unknown().optional(),
  }),
  post_call_analysis: z.unknown().optional(),
  transcriptions: z.unknown().optional(),
});

export type AgniWebhook = z.infer<typeof agniWebhookSchema>;

export function isExtractedField(value: unknown): value is z.infer<typeof extractedFieldSchema> {
  return extractedFieldSchema.safeParse(value).success;
}
