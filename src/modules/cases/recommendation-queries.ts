import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { advisorCaseRecommendations, catalogEvidenceSources, catalogInstitutions, catalogProgramRevisions, catalogPrograms, families, students } from "@/db/schema";

export async function getSavedRecommendationsForOwner(ownerUserId: string, familyId: string, studentId: string) {
  const rows = await getDb().select({
    recommendation: advisorCaseRecommendations,
    revision: catalogProgramRevisions,
    program: catalogPrograms,
    institution: catalogInstitutions,
    source: catalogEvidenceSources,
  }).from(advisorCaseRecommendations)
    .innerJoin(students, eq(advisorCaseRecommendations.studentId, students.id))
    .innerJoin(families, and(eq(students.familyId, families.id), eq(families.id, familyId), eq(families.ownerUserId, ownerUserId)))
    .innerJoin(catalogProgramRevisions, eq(advisorCaseRecommendations.revisionId, catalogProgramRevisions.id))
    .innerJoin(catalogPrograms, eq(catalogProgramRevisions.programId, catalogPrograms.id))
    .innerJoin(catalogInstitutions, eq(catalogPrograms.institutionId, catalogInstitutions.id))
    .innerJoin(catalogEvidenceSources, eq(catalogProgramRevisions.sourceId, catalogEvidenceSources.id))
    .where(and(eq(advisorCaseRecommendations.studentId, studentId), eq(advisorCaseRecommendations.status, "saved")))
    .orderBy(asc(advisorCaseRecommendations.createdAt));
  return { rows };
}
