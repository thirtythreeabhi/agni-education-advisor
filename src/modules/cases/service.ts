import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { advisorCaseEvents, advisorCaseMemory, advisorCaseRecommendations, advisorCases, consultations, families, students, studentConsultations } from "@/db/schema";
import { classifyMatch, matchCandidates, type CaseCandidate } from "./matching";
import { buildCompactBrief, refreshCompactBrief, resolveOpenQuestion, saveMemoryItems } from "./memory";
import { caseFactsSchema, createCaseInputSchema, getCaseContextInputSchema, recordCaseUpdateInputSchema, resolveCaseInputSchema, type CaseFacts } from "./validation";

const CASE_TTL_MS = 30 * 60 * 1000;
const CANDIDATE_LIMIT = 2000;

export type CaseMode = "demo" | "guest";
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeSummary(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["summary", "call_summary", "consultation_summary"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim().slice(0, 1200);
  }
  return null;
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function createToken() { return randomBytes(32).toString("base64url"); }
function nowPlusTtl() { return new Date(Date.now() + CASE_TTL_MS); }
function factsFromInput(input: Record<string, unknown>): CaseFacts {
  return caseFactsSchema.parse({ familyName: input.familyName, studentName: input.studentName, schoolName: input.schoolName, currentGrade: input.currentGrade, desiredDegree: input.desiredDegree, preferredIntake: input.preferredIntake, preferredCountry: input.preferredCountry, graduationYear: input.graduationYear });
}

async function appendEvent(tx: Transaction, caseId: string, eventType: string, payload: unknown) {
  const [last] = await tx.select({ sequence: advisorCaseEvents.sequence }).from(advisorCaseEvents).where(eq(advisorCaseEvents.caseId, caseId)).orderBy(desc(advisorCaseEvents.sequence)).limit(1);
  const sequence = (last?.sequence ?? 0) + 1;
  await tx.insert(advisorCaseEvents).values({ caseId, sequence, actor: "function", eventType, payload });
}

async function createCaseInTransaction(tx: Transaction, mode: CaseMode, facts: CaseFacts) {
  const rawToken = createToken();
  const [created] = await tx.insert(advisorCases).values({ caseTokenHash: tokenHash(rawToken), mode, expiresAt: nowPlusTtl() }).returning({ id: advisorCases.id, expiresAt: advisorCases.expiresAt });
  await appendEvent(tx, created.id, "case_created", { facts });
  return { ...created, token: rawToken, mode };
}

export async function loadCase(tx: Transaction, rawToken: string) {
  await tx.execute(`select pg_advisory_xact_lock(hashtextextended('${tokenHash(rawToken)}', 0))`);
  const [current] = await tx.select().from(advisorCases).where(eq(advisorCases.caseTokenHash, tokenHash(rawToken))).limit(1);
  if (!current) throw new Error("CASE_NOT_FOUND");
  if (current.expiresAt.getTime() <= Date.now()) {
    await tx.update(advisorCases).set({ status: "expired", updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, current.id));
    throw new Error("CASE_EXPIRED");
  }
  return current;
}

async function candidateRows(tx: Transaction, mode: CaseMode) {
  return tx.select({
    familyId: families.id, familyName: families.name, studentId: students.id, firstName: students.firstName, lastName: students.lastName,
    schoolName: students.schoolName, currentGrade: students.currentGrade, desiredDegree: students.desiredDegree, preferredIntake: students.preferredIntake,
    preferredCountries: students.preferredCountries, graduationYear: students.graduationYear,
  }).from(students).innerJoin(families, eq(students.familyId, families.id)).where(eq(families.isDemo, mode === "demo")).orderBy(asc(families.id), asc(students.id)).limit(CANDIDATE_LIMIT);
}

export async function createCase(mode: CaseMode, input: unknown) {
  const parsed = createCaseInputSchema.parse(input);
  const facts = factsFromInput(parsed);
  return getDb().transaction(async (tx) => {
    const created = await createCaseInTransaction(tx, mode, facts);
    return { caseToken: created.token, expiresAt: created.expiresAt, state: "provisional" as const, authorization: "none" as const };
  });
}

export async function resolveCase(mode: CaseMode, input: unknown) {
  const parsed = resolveCaseInputSchema.parse(input);
  const facts = factsFromInput(parsed);
  return getDb().transaction(async (tx) => {
    const created = parsed.caseToken ? undefined : await createCaseInTransaction(tx, mode, facts);
    const current = parsed.caseToken ? await loadCase(tx, parsed.caseToken) : created!;
    const responseToken = parsed.caseToken ?? created!.token;
    if (current.mode !== mode) throw new Error("CASE_MODE_MISMATCH");
    const candidates = await candidateRows(tx, mode) as CaseCandidate[];
    const result = classifyMatch(matchCandidates(candidates, facts), facts);
    if (result.state === "not_found") {
      await appendEvent(tx, current.id, "case_match_not_found", { facts });
      await tx.update(advisorCases).set({ status: "provisional", updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, current.id));
      return { caseToken: responseToken, state: result.state, authorization: "none" as const, nextQuestion: "I could not find a matching student yet. What school or university does the student attend?" };
    }
    if (result.state === "ambiguous") {
      await appendEvent(tx, current.id, "case_match_ambiguous", { facts, candidateCount: result.matches.length });
      await tx.update(advisorCases).set({ status: "ambiguous", updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, current.id));
      return { caseToken: responseToken, state: result.state, authorization: "none" as const, nextQuestion: result.nextQuestion };
    }
    const match = result.matches[0].candidate;
    await appendEvent(tx, current.id, "case_match_resolved", { facts, fuzzy: result.matches[0].fuzzy });
    if (mode === "demo") {
      await tx.update(advisorCases).set({ status: "resolved", authorization: "verified", familyId: match.familyId, studentId: match.studentId, updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, current.id));
      await tx.update(advisorCaseMemory).set({ studentId: match.studentId, updatedAt: new Date() }).where(and(eq(advisorCaseMemory.caseId, current.id), isNull(advisorCaseMemory.studentId)));
      await tx.update(advisorCaseRecommendations).set({ studentId: match.studentId, updatedAt: new Date() }).where(and(eq(advisorCaseRecommendations.caseId, current.id), isNull(advisorCaseRecommendations.studentId)));
      const [updatedCase] = await tx.select().from(advisorCases).where(eq(advisorCases.id, current.id)).limit(1);
      if (updatedCase) await refreshCompactBrief(tx, updatedCase);
      return { caseToken: responseToken, state: "resolved" as const, authorization: "verified" as const, student: { name: [match.firstName, match.lastName].filter(Boolean).join(" "), schoolName: match.schoolName, currentGrade: match.currentGrade, desiredDegree: match.desiredDegree, preferredIntake: match.preferredIntake } };
    }
    await tx.update(advisorCases).set({ status: "resolved", authorization: "pending", updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, current.id));
    return { caseToken: responseToken, state: "resolved" as const, authorization: "pending" as const, nextQuestion: "I found a possible match, but I need to verify your identity before sharing any student details." };
  });
}

export async function getCaseContext(mode: CaseMode, input: unknown) {
  const parsed = getCaseContextInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const current = await loadCase(tx, parsed.caseToken);
    if (current.mode !== mode) throw new Error("CASE_MODE_MISMATCH");
    const authorizedStudentId = current.mode === "demo" && current.authorization === "verified" ? current.studentId : null;
    const scope = authorizedStudentId
      ? or(eq(advisorCaseMemory.caseId, current.id), eq(advisorCaseMemory.studentId, authorizedStudentId))
      : eq(advisorCaseMemory.caseId, current.id);
    const items = await tx.select().from(advisorCaseMemory).where(scope).orderBy(desc(advisorCaseMemory.createdAt)).limit(100);
    const brief = current.compactBrief ?? buildCompactBrief(items);
    const response: Record<string, unknown> = {
      caseToken: parsed.caseToken,
      state: current.status,
      authorization: current.authorization,
      brief,
      unresolvedQuestions: (brief as { openQuestions?: unknown }).openQuestions ?? [],
    };
    if (parsed.detail === "brief") return response;

    const selected = parsed.categories ? new Set(parsed.categories) : null;
    response.evidence = items.filter((item) => !selected || selected.has(item.category)).slice(0, 30).map((item) => ({
      key: item.memoryKey,
      category: item.category,
      status: item.status,
      statement: item.statement,
      value: item.value,
      source: item.source,
      sourceConsultationId: item.sourceConsultationId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    if (authorizedStudentId) {
      const [student] = await tx.select({ firstName: students.firstName, lastName: students.lastName, schoolName: students.schoolName, currentGrade: students.currentGrade, desiredDegree: students.desiredDegree, preferredIntake: students.preferredIntake })
        .from(students).where(eq(students.id, authorizedStudentId)).limit(1);
      const consultationRows = await tx.select({ id: consultations.id, createdAt: consultations.createdAt, postCallAnalysis: consultations.postCallAnalysis })
        .from(studentConsultations).innerJoin(consultations, eq(studentConsultations.consultationId, consultations.id))
        .where(eq(studentConsultations.studentId, authorizedStudentId)).orderBy(desc(consultations.createdAt)).limit(5);
      response.student = student ? { name: [student.firstName, student.lastName].filter(Boolean).join(" "), schoolName: student.schoolName, currentGrade: student.currentGrade, desiredDegree: student.desiredDegree, preferredIntake: student.preferredIntake } : undefined;
      response.previousConsultations = consultationRows.map((row) => ({ consultationId: row.id, occurredAt: row.createdAt.toISOString(), summary: safeSummary(row.postCallAnalysis) })).filter((row) => row.summary);
    }
    return response;
  });
}

export async function recordCaseUpdate(mode: CaseMode, input: unknown) {
  const parsed = recordCaseUpdateInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const current = await loadCase(tx, parsed.caseToken);
    if (current.mode !== mode) throw new Error("CASE_MODE_MISMATCH");
    if (mode !== "demo" && parsed.category === "confirmed_profile") throw new Error("MEMORY_AUTH_REQUIRED");
    const studentId = current.mode === "demo" && current.authorization === "verified" ? current.studentId : null;
    if (parsed.resolvesMemoryKey) await resolveOpenQuestion(tx, { caseId: current.id, studentId }, parsed.resolvesMemoryKey);
    await saveMemoryItems(tx, { caseId: current.id, studentId, source: "caller" }, [{ memoryKey: parsed.memoryKey, category: parsed.category, status: parsed.status, statement: parsed.statement, value: parsed.value }]);
    await appendEvent(tx, current.id, "case_memory_updated", { memoryKey: parsed.memoryKey, category: parsed.category, status: parsed.status, resolvesMemoryKey: parsed.resolvesMemoryKey ?? null });
    const refreshed = await refreshCompactBrief(tx, { ...current, studentId });
    return { caseToken: parsed.caseToken, state: refreshed.status, authorization: refreshed.authorization, recorded: true, resolvedMemoryKey: parsed.resolvesMemoryKey ?? null };
  });
}
