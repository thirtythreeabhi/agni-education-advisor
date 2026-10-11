import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { consultations, consultationExtractions, families, familyEducationFinances, studentConsultations, students } from "@/db/schema";

type Database = ReturnType<typeof getDb>;

export function findFamilyForOwner(db: Database, familyId: string, ownerUserId: string) {
  return db.query.families.findFirst({ where: and(eq(families.id, familyId), eq(families.ownerUserId, ownerUserId)), with: { students: true, finances: true } });
}

export function findStudentForOwner(db: Database, studentId: string, ownerUserId: string) {
  return db.query.students.findFirst({ where: eq(students.id, studentId), with: { family: { columns: { ownerUserId: true } } } }).then((student) => student?.family.ownerUserId === ownerUserId ? student : undefined);
}

export async function listFamiliesForOwner(ownerUserId: string) {
  const db = getDb();
  return db.query.families.findMany({ where: eq(families.ownerUserId, ownerUserId), with: { students: true, finances: true }, orderBy: desc(families.updatedAt) });
}

export async function getFamilyForOwner(ownerUserId: string, familyId: string) {
  const db = getDb();
  const [family] = await db.select().from(families).where(and(eq(families.id, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
  if (!family) return undefined;
  const [familyStudents, finances] = await Promise.all([
    db.select().from(students).where(eq(students.familyId, familyId)).orderBy(students.createdAt),
    db.select().from(familyEducationFinances).where(eq(familyEducationFinances.familyId, familyId)).limit(1),
  ]);
  return { family, students: familyStudents, finances: finances[0] };
}

export async function getStudentForOwner(ownerUserId: string, familyId: string, studentId: string) {
  const db = getDb();
  const [student] = await db.select({ student: students, familyName: families.name }).from(students).innerJoin(families, eq(students.familyId, families.id)).where(and(eq(students.id, studentId), eq(students.familyId, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
  if (!student) return undefined;
  const history = await db.select({ consultation: consultations, associatedAt: studentConsultations.associatedAt }).from(studentConsultations).innerJoin(consultations, eq(studentConsultations.consultationId, consultations.id)).where(eq(studentConsultations.studentId, studentId)).orderBy(desc(studentConsultations.associatedAt));
  return { student: student.student, familyName: student.familyName, consultations: history };
}

export async function getConsultationForStudentOwner(ownerUserId: string, familyId: string, studentId: string, consultationId: string) {
  const db = getDb();
  const [row] = await db.select({ consultation: consultations, associatedAt: studentConsultations.associatedAt, familyName: families.name, studentName: students.firstName }).from(studentConsultations).innerJoin(consultations, eq(studentConsultations.consultationId, consultations.id)).innerJoin(students, eq(studentConsultations.studentId, students.id)).innerJoin(families, eq(students.familyId, families.id)).where(and(eq(studentConsultations.consultationId, consultationId), eq(studentConsultations.studentId, studentId), eq(students.familyId, familyId), eq(families.ownerUserId, ownerUserId))).limit(1);
  if (!row) return undefined;
  const extractions = await db.select({ fieldName: consultationExtractions.fieldName, normalizedValue: consultationExtractions.normalizedValue, state: consultationExtractions.state }).from(consultationExtractions).where(eq(consultationExtractions.consultationId, consultationId)).orderBy(consultationExtractions.fieldName);
  return { ...row, extractions };
}
