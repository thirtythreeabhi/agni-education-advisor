import { z } from "zod";

export const extractedFieldSchema = z.object({
  type: z.enum(["string", "number", "enum"]),
  value: z.unknown(),
});

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
