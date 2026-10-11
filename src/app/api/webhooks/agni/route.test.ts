import { beforeEach, describe, expect, it, vi } from "vitest";

const ingest = vi.hoisted(() => vi.fn());
vi.mock("@/modules/consultations/service", () => ({ ingestAgniWebhook: ingest }));

import { POST } from "./route";

const payload = { event: "call_completed", call_session: { id: "session-1", agent_id: "agent-1", status: "completed", duration_sec: 30, disconnect_reason: "hangup" }, post_call_analysis: { degree_level: { type: "string", value: "masters" } }, transcriptions: [{ text: "hello" }] };

describe("POST /api/webhooks/agni", () => {
  beforeEach(() => { process.env.AGNI_WEBHOOK_SECRET = "secret"; process.env.AGNI_WEBHOOK_HEADER_NAME = "x-agni-secret"; ingest.mockReset(); });

  it("accepts a valid webhook", async () => {
    ingest.mockResolvedValue({ consultationId: "db-id", duplicate: false });
    const response = await POST(new Request("http://localhost/api/webhooks/agni", { method: "POST", headers: { "content-type": "application/json", "x-agni-secret": "secret" }, body: JSON.stringify(payload) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: false });
  });

  it("rejects invalid authentication", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/agni", { method: "POST", headers: { "x-agni-secret": "wrong" }, body: JSON.stringify(payload) }));
    expect(response.status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it("rejects malformed payloads", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/agni", { method: "POST", headers: { "x-agni-secret": "secret" }, body: JSON.stringify({ event: "wrong" }) }));
    expect(response.status).toBe(400);
  });

  it("rejects an oversized payload before parsing", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/agni", { method: "POST", headers: { "x-agni-secret": "secret", "content-length": "1000001" }, body: "{}" }));
    expect(response.status).toBe(413);
  });

  it("returns duplicate-safe success for a repeated event", async () => {
    ingest.mockResolvedValue({ consultationId: "db-id", duplicate: true });
    const response = await POST(new Request("http://localhost/api/webhooks/agni", { method: "POST", headers: { "x-agni-secret": "secret" }, body: JSON.stringify(payload) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ duplicate: true });
  });

  it("returns retryable failure when processing is incomplete", async () => {
    ingest.mockRejectedValue(new Error("database unavailable"));
    const response = await POST(new Request("http://localhost/api/webhooks/agni", { method: "POST", headers: { "x-agni-secret": "secret" }, body: JSON.stringify(payload) }));
    expect(response.status).toBe(500);
  });
});
