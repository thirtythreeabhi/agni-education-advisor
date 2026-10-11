import { createHash } from "node:crypto";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { advisorCaseMemory, advisorCases, type AdvisorCase, type AdvisorCaseMemory } from "@/db/schema";

export const memoryCategories = ["confirmed_profile", "caller_reported", "preference", "decision", "proposed_change", "unresolved_question", "promised_action", "follow_up_outcome", "discussed_university"] as const;
export const memoryStatuses = ["active", "resolved", "superseded", "rejected", "uncertain", "conflicted"] as const;
export type MemoryCategory = typeof memoryCategories[number];
export type MemoryStatus = typeof memoryStatuses[number];

export type MemoryDraft = {
  memoryKey: string;
  category: MemoryCategory;
  status: MemoryStatus;
  statement: string;
  value?: unknown;
};

export type MemoryTarget = { caseId?: string | null; studentId?: string | null; sourceConsultationId?: string | null; source: "caller" | "function" | "webhook_extraction" | "admin" | "system" };
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function slug(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 120) || "memory_item"; }

function asRecord(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
function asText(value: unknown) { return typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : null; }
function isCategory(value: unknown): value is MemoryCategory { return typeof value === "string" && (memoryCategories as readonly string[]).includes(value); }
function isStatus(value: unknown): value is MemoryStatus { return typeof value === "string" && (memoryStatuses as readonly string[]).includes(value); }

function addEntry(entries: MemoryDraft[], value: unknown, fallbackCategory?: MemoryCategory) {
  const record = asRecord(value);
  if (typeof value === "string") {
    const statement = asText(value);
    if (statement && fallbackCategory) entries.push({ memoryKey: slug(statement), category: fallbackCategory, status: "active", statement });
    return;
  }
  if (!record) return;
  const statement = asText(record.statement ?? record.text ?? record.description ?? record.outcome ?? record.question);
  const category = isCategory(record.category) ? record.category : fallbackCategory;
  if (!statement || !category) return;
  entries.push({ memoryKey: asText(record.key ?? record.memory_key) ? slug(String(record.key ?? record.memory_key)) : slug(statement), category, status: isStatus(record.status) ? record.status : "active", statement, value: record.value });
}

export function extractPostCallMemory(analysis: unknown): MemoryDraft[] {
  const record = asRecord(analysis);
  if (!record) return [];
  const entries: MemoryDraft[] = [];
  if (Array.isArray(record.memory_items)) record.memory_items.forEach((item) => addEntry(entries, item));
  const keyCategories: Array<[string, MemoryCategory]> = [
    ["confirmed_profile", "confirmed_profile"], ["caller_reported", "caller_reported"], ["preferences", "preference"], ["decisions", "decision"],
    ["proposed_changes", "proposed_change"], ["unresolved_questions", "unresolved_question"], ["promised_actions", "promised_action"],
    ["follow_up_outcomes", "follow_up_outcome"], ["discussed_universities", "discussed_university"],
  ];
  for (const [key, category] of keyCategories) {
    const values = record[key];
    if (Array.isArray(values)) values.forEach((item) => addEntry(entries, item, category));
    else if (values !== undefined) addEntry(entries, values, category);
  }
  return entries;
}

export async function saveMemoryItems(tx: Transaction, target: MemoryTarget, drafts: MemoryDraft[]) {
  if (!target.caseId && !target.studentId) throw new Error("MEMORY_TARGET_REQUIRED");
  for (const draft of drafts) {
    const fingerprint = hash(JSON.stringify({ caseId: target.caseId ?? null, studentId: target.studentId ?? null, sourceConsultationId: target.sourceConsultationId ?? null, source: target.source, memoryKey: draft.memoryKey, category: draft.category, status: draft.status, statement: draft.statement, value: draft.value ?? null }));
    await tx.insert(advisorCaseMemory).values({ caseId: target.caseId ?? null, studentId: target.studentId ?? null, sourceConsultationId: target.sourceConsultationId ?? null, memoryKey: draft.memoryKey, category: draft.category, status: draft.status, source: target.source, statement: draft.statement, value: draft.value ?? null, fingerprint }).onConflictDoNothing({ target: advisorCaseMemory.fingerprint });
  }
}

export async function resolveOpenQuestion(tx: Transaction, target: { caseId?: string | null; studentId?: string | null }, memoryKey: string) {
  const scope = target.studentId && target.caseId ? or(eq(advisorCaseMemory.studentId, target.studentId), eq(advisorCaseMemory.caseId, target.caseId)) : target.studentId ? eq(advisorCaseMemory.studentId, target.studentId) : target.caseId ? eq(advisorCaseMemory.caseId, target.caseId) : undefined;
  if (!scope) return;
  await tx.update(advisorCaseMemory).set({ status: "resolved", updatedAt: new Date() }).where(and(scope, eq(advisorCaseMemory.memoryKey, memoryKey), eq(advisorCaseMemory.category, "unresolved_question"), inArray(advisorCaseMemory.status, ["active", "uncertain", "conflicted"])));
}

function compactItems(items: AdvisorCaseMemory[], category: MemoryCategory, statuses: MemoryStatus[], limit: number) {
  return items.filter((item) => item.category === category && statuses.includes(item.status as MemoryStatus)).slice(0, limit).map((item) => ({ key: item.memoryKey, statement: item.statement, status: item.status, createdAt: item.createdAt.toISOString(), sourceConsultationId: item.sourceConsultationId }));
}

export function buildCompactBrief(items: AdvisorCaseMemory[]) {
  const sorted = [...items].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return {
    openQuestions: compactItems(sorted, "unresolved_question", ["active", "uncertain", "conflicted"], 3),
    promisedActions: compactItems(sorted, "promised_action", ["active", "uncertain"], 3),
    recentOutcomes: compactItems(sorted, "follow_up_outcome", ["active", "resolved"], 3),
    recentDecisions: compactItems(sorted, "decision", ["active", "resolved"], 3),
    discussedUniversities: compactItems(sorted, "discussed_university", ["active", "resolved"], 5),
    generatedAt: new Date().toISOString(),
  };
}

export async function refreshCompactBrief(tx: Transaction, caseRecord: AdvisorCase) {
  const scope = caseRecord.studentId ? or(eq(advisorCaseMemory.caseId, caseRecord.id), eq(advisorCaseMemory.studentId, caseRecord.studentId)) : eq(advisorCaseMemory.caseId, caseRecord.id);
  const items = await tx.select().from(advisorCaseMemory).where(scope).orderBy(desc(advisorCaseMemory.createdAt)).limit(100);
  const [updated] = await tx.update(advisorCases).set({ compactBrief: buildCompactBrief(items), updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, caseRecord.id)).returning();
  return updated;
}

export async function refreshCompactBriefsForStudent(tx: Transaction, studentId: string) {
  const cases = await tx.select().from(advisorCases).where(eq(advisorCases.studentId, studentId));
  for (const caseRecord of cases) await refreshCompactBrief(tx, caseRecord);
}

export async function consolidateConsultationMemory(tx: Transaction, input: { consultationId: string; studentId: string; caseId?: string | null; analysis: unknown }) {
  const drafts = extractPostCallMemory(input.analysis);
  if (!drafts.length) return 0;
  await saveMemoryItems(tx, { caseId: input.caseId, studentId: input.studentId, sourceConsultationId: input.consultationId, source: "webhook_extraction" }, drafts);
  return drafts.length;
}
