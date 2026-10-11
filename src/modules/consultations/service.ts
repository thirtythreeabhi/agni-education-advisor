import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { consultationExtractions, consultations } from "@/db/schema";
import { agniWebhookSchema, type AgniWebhook } from "@/lib/agni-schema";
import { normalizeExtractedFields } from "@/lib/normalization";
import { stripRecordingAccessTokens } from "@/lib/security";

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function persistAgniWebhook(tx: DbTransaction, parsed: AgniWebhook) {
  // Serialize same-session deliveries inside the database transaction. This avoids
  // select-then-insert races while keeping different sessions concurrent.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${parsed.call_session.id}, 0))`);
  const [existing] = await tx.select().from(consultations).where(eq(consultations.agniSessionId, parsed.call_session.id)).limit(1);
  if (existing?.processingStatus === "processed") return { consultationId: existing.id, duplicate: true };

  const analysis = parsed.post_call_analysis ?? parsed.call_session.post_call_analysis_result;
  const safeAnalysis = stripRecordingAccessTokens(analysis);
  const safeTranscriptions = stripRecordingAccessTokens(parsed.transcriptions);
  const now = new Date();
  let consultationId = existing?.id;
  if (existing) {
    await tx.update(consultations).set({
        agentId: parsed.call_session.agent_id ?? existing.agentId,
        agniStatus: parsed.call_session.status ?? existing.agniStatus,
        durationSec: parsed.call_session.duration_sec ?? existing.durationSec,
        disconnectReason: parsed.call_session.disconnect_reason ?? existing.disconnectReason,
        postCallAnalysis: safeAnalysis,
        transcriptions: safeTranscriptions,
        processingStatus: "processing",
        processingError: null,
        updatedAt: now,
    }).where(eq(consultations.id, existing.id));
  } else {
    const [created] = await tx.insert(consultations).values({
        agniSessionId: parsed.call_session.id,
        agentId: parsed.call_session.agent_id,
        agniStatus: parsed.call_session.status,
        durationSec: parsed.call_session.duration_sec,
        disconnectReason: parsed.call_session.disconnect_reason,
        postCallAnalysis: safeAnalysis,
        transcriptions: safeTranscriptions,
        processingStatus: "processing",
    }).returning({ id: consultations.id });
    consultationId = created.id;
  }

  const extractions = normalizeExtractedFields(analysis).map((item) => ({
    consultationId: consultationId!,
    fieldName: item.fieldName,
    fieldType: item.fieldType,
    originalValue: item.originalValue,
    normalizedValue: item.normalizedValue,
    state: item.state,
  }));
  if (extractions.length) {
    await tx.insert(consultationExtractions).values(extractions).onConflictDoUpdate({
      target: [consultationExtractions.consultationId, consultationExtractions.fieldName],
      set: { fieldType: sql`excluded.field_type`, originalValue: sql`excluded.original_value`, normalizedValue: sql`excluded.normalized_value`, state: sql`excluded.state` },
    });
  }
  await tx.update(consultations).set({ processingStatus: "processed", updatedAt: new Date() }).where(eq(consultations.id, consultationId!));
  return { consultationId: consultationId!, duplicate: false };
}

export async function ingestAgniWebhook(payload: AgniWebhook) {
  const parsed = agniWebhookSchema.parse(payload);
  const db = getDb();
  return db.transaction((tx) => persistAgniWebhook(tx, parsed));
}
