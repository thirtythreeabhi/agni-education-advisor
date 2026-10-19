import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { families, students, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/** Admin-only directory summary. Existing owner-scoped queries remain unchanged. */
export async function listFamiliesForAdmin() {
  await requireAdmin();
  return getDb()
    .select({
      id: families.id,
      name: families.name,
      studentCount: sql<number>`count(${students.id})::int`,
      updatedAt: families.updatedAt,
    })
    .from(families)
    .leftJoin(students, eq(students.familyId, families.id))
    .groupBy(families.id, families.name, families.updatedAt)
    .orderBy(desc(families.updatedAt));
}

/** Minimal member data for the admin-only Members & Access view. */
export async function getFamilyMembersForAdmin(familyId: string) {
  await requireAdmin();
  const db = getDb();
  const [family] = await db
    .select({ id: families.id, name: families.name, ownerEmail: users.email })
    .from(families)
    .innerJoin(users, eq(users.id, families.ownerUserId))
    .where(eq(families.id, familyId))
    .limit(1);

  if (!family) return undefined;

  const familyStudents = await db
    .select({ id: students.id, firstName: students.firstName, lastName: students.lastName })
    .from(students)
    .where(eq(students.familyId, familyId))
    .orderBy(students.createdAt);

  return { family: { id: family.id, name: family.name }, ownerEmail: family.ownerEmail, students: familyStudents };
}
