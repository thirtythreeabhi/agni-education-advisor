import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import { consultations } from "@/db/schema";
import { agniWebhookSchema } from "@/lib/agni-schema";
import { ingestAgniWebhook, persistAgniWebhook } from "./service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const sessionId = `test-phase1-${Date.now()}`;
const payload = agniWebhookSchema.parse({
  event: "call_completed",
  call_session: { id: sessionId, agent_id: "test-agent", status: "completed", duration_sec: 12 },
  post_call_analysis: { degree_level: { type: "string", value: "masters" } },
  transcriptions: [{ text: "synthetic test fixture" }],
});

describeDatabase("consultation ingestion against an isolated TEST_DATABASE_URL", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    await getDb().delete(consultations).where(eq(consultations.agniSessionId, sessionId));
  });

  afterAll(async () => {
    await getDb().delete(consultations).where(eq(consultations.agniSessionId, sessionId));
    await closeDb();
  });

  it("deduplicates repeated session delivery", async () => {
    const first = await ingestAgniWebhook(payload);
    const second = await ingestAgniWebhook(payload);
    expect(first.duplicate).toBe(false);
    expect(second).toMatchObject({ consultationId: first.consultationId, duplicate: true });
  });

  it("rolls back the consultation and extraction together", async () => {
    const rollbackSession = { ...payload, call_session: { ...payload.call_session, id: `${sessionId}-rollback` } };
    await expect(getDb().transaction(async (tx) => {
      await persistAgniWebhook(tx, rollbackSession);
      throw new Error("intentional test rollback");
    })).rejects.toThrow("intentional test rollback");
    const rows = await getDb().select().from(consultations).where(eq(consultations.agniSessionId, rollbackSession.call_session.id));
    expect(rows).toHaveLength(0);
  });
});
