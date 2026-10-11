import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { closeDb, getDb } from "@/db/client";
import { advisorCaseEvents, families, users } from "@/db/schema";
import { addStudent, createFamily } from "@/modules/families/service";
import { createCase, resolveCase } from "./service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;
const ownerId = randomUUID();
const familyIds: string[] = [];

describeDatabase("conversational case service", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    await getDb().insert(users).values({ id: ownerId, email: `${ownerId}@example.com`, passwordHash: "test-hash", role: "user" });
    for (let index = 0; index < 5; index += 1) {
      const family = await createFamily(ownerId, { name: "Singh family" });
      familyIds.push(family.id);
      await addStudent(ownerId, family.id, { firstName: "Akash", lastName: "Singh", schoolName: index === 0 ? "Indian Institute of Technology Delhi" : "Delhi Public School", currentGrade: "12", desiredDegree: "Computer Science", preferredCountries: [], graduationYear: 2027 });
    }
    const demoFamily = await createFamily(ownerId, { name: "Singh family" });
    familyIds.push(demoFamily.id);
    await getDb().update(families).set({ isDemo: true }).where(eq(families.id, demoFamily.id));
    await addStudent(ownerId, demoFamily.id, { firstName: "Akash", lastName: "Singh", schoolName: "Indian Institute of Technology Delhi", currentGrade: "12", desiredDegree: "Computer Science", preferredCountries: [], graduationYear: 2027 });
  });

  afterAll(async () => {
    const db = getDb();
    for (const familyId of familyIds) await db.delete(families).where(eq(families.id, familyId));
    await db.delete(users).where(eq(users.id, ownerId));
    await closeDb();
  });

  it("keeps duplicate names ambiguous and narrows with IIT Delhi", async () => {
    const created = await createCase("guest", { familyName: "Singh family", studentName: "Akash Singh" });
    const ambiguous = await resolveCase("guest", { caseToken: created.caseToken, familyName: "Singh", studentName: "Akash Singh" });
    expect(ambiguous.state).toBe("ambiguous");
    expect(ambiguous).toHaveProperty("nextQuestion");
    const demoCase = await createCase("demo", {});
    const resolved = await resolveCase("demo", { caseToken: demoCase.caseToken, familyName: "Singh", studentName: "Akash Singh", schoolName: "IIT Delhi" });
    expect(resolved).toMatchObject({ state: "resolved", authorization: "verified" });
    expect(resolved).toHaveProperty("student.schoolName", "Indian Institute of Technology Delhi");
  });

  it("never discloses a real owner-scoped student to an unverified guest", async () => {
    const created = await createCase("guest", { familyName: "Singh family", studentName: "Akash Singh", schoolName: "IIT Delhi" });
    const result = await resolveCase("guest", { caseToken: created.caseToken, familyName: "Singh", studentName: "Akash Singh", schoolName: "IIT Delhi" });
    expect(result).toMatchObject({ state: "resolved", authorization: "pending" });
    expect(result).not.toHaveProperty("student");
  });

  it("isolates tokens and serializes concurrent updates to one case", async () => {
    const first = await createCase("demo", {});
    const second = await createCase("demo", {});
    await expect(resolveCase("demo", { caseToken: "not-a-real-case-token", familyName: "Singh" })).rejects.toThrow("CASE_NOT_FOUND");
    const results = await Promise.all(Array.from({ length: 4 }, () => resolveCase("demo", { caseToken: first.caseToken, familyName: "No such family" })));
    expect(results.every((result) => result.state === "not_found")).toBe(true);
    const events = await getDb().select({ caseId: advisorCaseEvents.caseId, sequence: advisorCaseEvents.sequence }).from(advisorCaseEvents);
    const seen = new Set(events.map((event) => `${event.caseId}:${event.sequence}`));
    expect(seen.size).toBe(events.length);
    expect(second.caseToken).not.toBe(first.caseToken);
  });
});
