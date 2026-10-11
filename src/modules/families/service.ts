import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { consultations, familyAuditEvents, families, familyEducationFinances, studentConsultations, students } from "@/db/schema";
import { auditChanges } from "./audit";
import { createFamilyInputSchema, educationFinancesInputSchema, studentInputSchema, consultationAssociationInputSchema, type EducationFinancesInput, type StudentInput } from "./validation";

export async function createFamily(ownerUserId: string, input: unknown) {
  const values = createFamilyInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [family] = await tx.insert(families).values({ ownerUserId, name: values.name }).returning();
    await tx.insert(familyAuditEvents).values({ familyId: family.id, actorUserId: ownerUserId, eventType: "family_created", changes: values });
    return family;
  });
}

export async function addStudent(ownerUserId: string, familyId: string, input: StudentInput | unknown) {
  const values = studentInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [family] = await tx.select({ id: families.id }).from(families).where(and(eq(families.id, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
    if (!family) throw new Error("FAMILY_NOT_FOUND");
    const [student] = await tx.insert(students).values({ ...values, familyId }).returning();
    await tx.insert(familyAuditEvents).values({ familyId, studentId: student.id, actorUserId: ownerUserId, eventType: "student_created", changes: values });
    return student;
  });
}

export async function updateEducationFinances(ownerUserId: string, familyId: string, input: EducationFinancesInput | unknown) {
  const values = educationFinancesInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [family] = await tx.select({ id: families.id }).from(families).where(and(eq(families.id, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
    if (!family) throw new Error("FAMILY_NOT_FOUND");
    const [existing] = await tx.select().from(familyEducationFinances).where(eq(familyEducationFinances.familyId, familyId)).limit(1);
    const [finances] = existing
      ? await tx.update(familyEducationFinances).set({ ...values, updatedAt: new Date() }).where(eq(familyEducationFinances.familyId, familyId)).returning()
      : await tx.insert(familyEducationFinances).values({ ...values, familyId }).returning();
    await tx.insert(familyAuditEvents).values({ familyId, actorUserId: ownerUserId, eventType: "education_finances_updated", changes: auditChanges(existing as Record<string, unknown> | null, values) });
    return finances;
  });
}

export async function associateConsultation(ownerUserId: string, familyId: string, input: unknown) {
  const values = consultationAssociationInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [student] = await tx.select({ id: students.id, familyId: students.familyId }).from(students).innerJoin(families, eq(students.familyId, families.id)).where(and(eq(students.id, values.studentId), eq(families.id, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    const [association] = await tx.insert(studentConsultations).values({ ...values, associatedByUserId: ownerUserId }).returning();
    await tx.update(consultations).set({ associationStatus: "associated", updatedAt: new Date() }).where(eq(consultations.id, values.consultationId));
    await tx.insert(familyAuditEvents).values({ familyId, studentId: values.studentId, consultationId: values.consultationId, actorUserId: ownerUserId, eventType: "consultation_associated", changes: values });
    return association;
  });
}

export async function disassociateConsultation(ownerUserId: string, familyId: string, input: unknown) {
  const values = consultationAssociationInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [student] = await tx.select({ id: students.id }).from(students).innerJoin(families, eq(students.familyId, families.id)).where(and(eq(students.id, values.studentId), eq(families.id, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    const deleted = await tx.delete(studentConsultations).where(and(eq(studentConsultations.studentId, values.studentId), eq(studentConsultations.consultationId, values.consultationId))).returning({ studentId: studentConsultations.studentId });
    if (!deleted.length) throw new Error("ASSOCIATION_NOT_FOUND");
    const [remaining] = await tx.select({ count: sql<number>`count(*)` }).from(studentConsultations).where(eq(studentConsultations.consultationId, values.consultationId));
    if (Number(remaining.count) === 0) await tx.update(consultations).set({ associationStatus: "unassociated", updatedAt: new Date() }).where(eq(consultations.id, values.consultationId));
    await tx.insert(familyAuditEvents).values({ familyId, studentId: values.studentId, consultationId: values.consultationId, actorUserId: ownerUserId, eventType: "consultation_disassociated", changes: values });
    return deleted[0];
  });
}
