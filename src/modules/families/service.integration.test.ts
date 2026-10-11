import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/db/client";
import { consultations, families, users } from "@/db/schema";
import { addStudent, associateConsultation, createFamily, disassociateConsultation, updateEducationFinances, updateStudent } from "./service";
import { getStudentForOwner } from "./queries";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const ownerUserId = randomUUID();
const otherUserId = randomUUID();
const consultationId = randomUUID();
let familyId: string;
let studentId: string;

describeDatabase("family domain CRUD and authorization", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const db = getDb();
    await db.insert(users).values([
      { id: ownerUserId, email: `${ownerUserId}@example.com`, passwordHash: "test-hash", role: "admin" },
      { id: otherUserId, email: `${otherUserId}@example.com`, passwordHash: "test-hash" },
    ]);
    await db.insert(consultations).values({ id: consultationId, agniSessionId: `family-test-${consultationId}` });
  });

  afterAll(async () => {
    const db = getDb();
    if (familyId) await db.delete(families).where(eq(families.id, familyId));
    await db.delete(consultations).where(eq(consultations.id, consultationId));
    await db.delete(users).where(eq(users.id, ownerUserId));
    await db.delete(users).where(eq(users.id, otherUserId));
    await closeDb();
  });

  it("creates, updates, reads, and associates a student", async () => {
    const family = await createFamily(ownerUserId, { name: "Integration family" });
    familyId = family.id;
    const student = await addStudent(ownerUserId, family.id, { firstName: "Asha", preferredCountries: ["Canada"] });
    studentId = student.id;
    const updated = await updateStudent(ownerUserId, family.id, student.id, { firstName: "Asha", desiredDegree: "Computer Science", preferredCountries: ["Canada", "Germany"] });
    expect(updated.desiredDegree).toBe("Computer Science");
    const finances = await updateEducationFinances(ownerUserId, family.id, { annualBudgetState: "review", fundingSourceState: "unknown", financialAidState: "unknown" });
    expect(finances.annualBudgetState).toBe("review");
    await associateConsultation(ownerUserId, family.id, { studentId: student.id, consultationId });
    const result = await getStudentForOwner(ownerUserId, family.id, student.id);
    expect(result?.consultations).toHaveLength(1);
    expect(result?.student.preferredCountries).toEqual(["Canada", "Germany"]);
    await disassociateConsultation(ownerUserId, family.id, { studentId: student.id, consultationId });
    expect((await getStudentForOwner(ownerUserId, family.id, student.id))?.consultations).toHaveLength(0);
  });

  it("rejects another user's family and student mutations", async () => {
    await expect(addStudent(otherUserId, familyId, { firstName: "Blocked" })).rejects.toThrow("FAMILY_NOT_FOUND");
    await expect(updateStudent(otherUserId, familyId, studentId, { firstName: "Blocked" })).rejects.toThrow("STUDENT_NOT_FOUND");
    expect(await getStudentForOwner(otherUserId, familyId, studentId)).toBeUndefined();
  });
});
