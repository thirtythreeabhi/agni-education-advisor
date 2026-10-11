import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import { consultationExtractions, consultationProfileProposals, consultations, families, students, users } from "@/db/schema";
import { addStudent, createFamily } from "@/modules/families/service";
import { ingestAgniWebhook } from "./service";
import { associateConsultationAsAdmin, resolveProfileProposal } from "./association-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const adminUserId = randomUUID();
const ownerUserId = randomUUID();
const consultationId = randomUUID();
const agniSessionId = `association-test-${consultationId}`;
let familyId: string;
let studentId: string;

describeDatabase("admin consultation association", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const db = getDb();
    await db.insert(users).values([
      { id: adminUserId, email: `${adminUserId}@example.com`, passwordHash: "test-hash", role: "admin" },
      { id: ownerUserId, email: `${ownerUserId}@example.com`, passwordHash: "test-hash", role: "user" },
    ]);
    const family = await createFamily(ownerUserId, { name: "Association family" });
    familyId = family.id;
    const student = await addStudent(ownerUserId, family.id, { firstName: "Asha", currentGrade: "12", preferredCountries: [] });
    studentId = student.id;
    await db.insert(consultations).values({ id: consultationId, agniSessionId, processingStatus: "processed" });
    await db.insert(consultationExtractions).values([
      { consultationId, fieldName: "current_grade", fieldType: "string", normalizedValue: "11", originalValue: "11", state: "confirmed" },
      { consultationId, fieldName: "desired_degree", fieldType: "string", normalizedValue: "Computer Science", originalValue: "Computer Science", state: "confirmed" },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    if (familyId) await db.delete(families).where(eq(families.id, familyId));
    await db.delete(consultations).where(eq(consultations.id, consultationId));
    await db.delete(users).where(eq(users.id, adminUserId));
    await db.delete(users).where(eq(users.id, ownerUserId));
    await closeDb();
  });

  it("associates once, creates proposals, and preserves existing data across duplicates", async () => {
    const first = await associateConsultationAsAdmin(adminUserId, { consultationId, studentId });
    expect(first).toMatchObject({ duplicate: false, proposalCount: 2 });
    const duplicate = await associateConsultationAsAdmin(adminUserId, { consultationId, studentId });
    expect(duplicate).toMatchObject({ duplicate: true });
    const proposals = await getDb().select().from(consultationProfileProposals).where(eq(consultationProfileProposals.consultationId, consultationId));
    expect(proposals).toHaveLength(2);
    const [beforeWebhook] = await getDb().select({ currentGrade: students.currentGrade, desiredDegree: students.desiredDegree }).from(students).where(eq(students.id, studentId));
    const result = await ingestAgniWebhook({ event: "call_completed", call_session: { id: agniSessionId }, post_call_analysis: { current_grade: { type: "string", value: "10" } } });
    expect(result.duplicate).toBe(true);
    const [afterWebhook] = await getDb().select({ currentGrade: students.currentGrade, desiredDegree: students.desiredDegree }).from(students).where(eq(students.id, studentId));
    expect(afterWebhook).toEqual(beforeWebhook);
  });

  it("requires admin permission and resolves conflicts explicitly", async () => {
    await expect(associateConsultationAsAdmin(ownerUserId, { consultationId, studentId })).rejects.toThrow("ADMIN_REQUIRED");
    const proposals = await getDb().select().from(consultationProfileProposals).where(eq(consultationProfileProposals.consultationId, consultationId));
    const conflict = proposals.find((proposal) => proposal.fieldName === "current_grade");
    const pending = proposals.find((proposal) => proposal.fieldName === "desired_degree");
    expect(conflict?.state).toBe("conflict");
    await resolveProfileProposal(adminUserId, { proposalId: conflict!.id, decision: "keep_existing" });
    await resolveProfileProposal(adminUserId, { proposalId: pending!.id, decision: "apply_corrected", correctedValue: "Computer Science and AI" });
    const [student] = await getDb().select({ currentGrade: students.currentGrade, desiredDegree: students.desiredDegree }).from(students).where(and(eq(students.id, studentId), eq(students.familyId, familyId)));
    expect(student).toEqual({ currentGrade: "12", desiredDegree: "Computer Science and AI" });
  });
});
