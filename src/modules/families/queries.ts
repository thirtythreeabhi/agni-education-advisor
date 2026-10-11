import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db/client";
import { families, students } from "@/db/schema";

type Database = ReturnType<typeof getDb>;

export function findFamilyForOwner(db: Database, familyId: string, ownerUserId: string) {
  return db.query.families.findFirst({ where: and(eq(families.id, familyId), eq(families.ownerUserId, ownerUserId)), with: { students: true, finances: true } });
}

export function findStudentForOwner(db: Database, studentId: string, ownerUserId: string) {
  return db.query.students.findFirst({ where: eq(students.id, studentId), with: { family: { columns: { ownerUserId: true } } } }).then((student) => student?.family.ownerUserId === ownerUserId ? student : undefined);
}
