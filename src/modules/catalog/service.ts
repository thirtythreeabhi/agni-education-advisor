import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  academicRequirementInputSchema,
  evidenceSourceInputSchema,
  intakeInputSchema,
  institutionInputSchema,
  programFeeInputSchema,
  programInputSchema,
  programRevisionInputSchema,
  catalogAcademicRequirements,
  catalogEvidenceSources,
  catalogInstitutionSources,
  catalogInstitutions,
  catalogProgramFees,
  catalogProgramIntakes,
  catalogProgramRevisions,
  catalogPrograms,
} from "./schema";

function dateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : value ?? null;
}

export async function listInstitutions() {
  return getDb().select().from(catalogInstitutions).orderBy(asc(catalogInstitutions.officialName)).limit(200);
}

export async function listPrograms() {
  return getDb()
    .select({
      id: catalogPrograms.id,
      stableKey: catalogPrograms.stableKey,
      degreeLevel: catalogPrograms.degreeLevel,
      discipline: catalogPrograms.discipline,
      specialization: catalogPrograms.specialization,
      institutionId: catalogInstitutions.id,
      institutionName: catalogInstitutions.officialName,
    })
    .from(catalogPrograms)
    .innerJoin(catalogInstitutions, eq(catalogPrograms.institutionId, catalogInstitutions.id))
    .orderBy(asc(catalogInstitutions.officialName), asc(catalogPrograms.stableKey))
    .limit(300);
}

export async function getInstitution(id: string) {
  const [institution] = await getDb().select().from(catalogInstitutions).where(eq(catalogInstitutions.id, id)).limit(1);
  if (!institution) return null;
  const programs = await getDb().select().from(catalogPrograms).where(eq(catalogPrograms.institutionId, id)).orderBy(asc(catalogPrograms.stableKey));
  const sources = await getDb()
    .select({
      id: catalogInstitutionSources.id,
      sourceId: catalogEvidenceSources.id,
      url: catalogEvidenceSources.url,
      publisher: catalogEvidenceSources.publisher,
      verificationStatus: catalogInstitutionSources.verificationStatus,
      verifiedAt: catalogInstitutionSources.verifiedAt,
    })
    .from(catalogInstitutionSources)
    .innerJoin(catalogEvidenceSources, eq(catalogInstitutionSources.sourceId, catalogEvidenceSources.id))
    .where(eq(catalogInstitutionSources.institutionId, id));
  return { institution, programs, sources };
}

export async function getProgramDetail(id: string) {
  const [program] = await getDb()
    .select({
      id: catalogPrograms.id,
      stableKey: catalogPrograms.stableKey,
      degreeLevel: catalogPrograms.degreeLevel,
      discipline: catalogPrograms.discipline,
      specialization: catalogPrograms.specialization,
      institutionId: catalogInstitutions.id,
      institutionName: catalogInstitutions.officialName,
    })
    .from(catalogPrograms)
    .innerJoin(catalogInstitutions, eq(catalogPrograms.institutionId, catalogInstitutions.id))
    .where(eq(catalogPrograms.id, id))
    .limit(1);
  if (!program) return null;

  const revisions = await getDb()
    .select({
      id: catalogProgramRevisions.id,
      academicYear: catalogProgramRevisions.academicYear,
      programTitle: catalogProgramRevisions.programTitle,
      verificationStatus: catalogProgramRevisions.verificationStatus,
      retrievedAt: catalogProgramRevisions.retrievedAt,
      verifiedAt: catalogProgramRevisions.verifiedAt,
      effectiveTo: catalogProgramRevisions.effectiveTo,
      sourceId: catalogEvidenceSources.id,
      sourceUrl: catalogEvidenceSources.url,
      sourcePublisher: catalogEvidenceSources.publisher,
    })
    .from(catalogProgramRevisions)
    .innerJoin(catalogEvidenceSources, eq(catalogProgramRevisions.sourceId, catalogEvidenceSources.id))
    .where(eq(catalogProgramRevisions.programId, id))
    .orderBy(desc(catalogProgramRevisions.academicYear), desc(catalogProgramRevisions.createdAt));

  const revisionIds = revisions.map((revision) => revision.id);
  if (revisionIds.length === 0) return { program, revisions: [], intakes: [], requirements: [], fees: [] };
  const [intakes, requirements, fees] = await Promise.all([
    getDb().select().from(catalogProgramIntakes).where(inArray(catalogProgramIntakes.revisionId, revisionIds)),
    getDb().select().from(catalogAcademicRequirements).where(inArray(catalogAcademicRequirements.revisionId, revisionIds)),
    getDb().select().from(catalogProgramFees).where(inArray(catalogProgramFees.revisionId, revisionIds)),
  ]);
  return { program, revisions, intakes, requirements, fees };
}

export async function createInstitution(input: unknown) {
  const parsed = institutionInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const [institution] = await tx.insert(catalogInstitutions).values({
      stableKey: parsed.stableKey,
      officialName: parsed.officialName,
      countryCode: parsed.countryCode,
    }).returning();
    await tx.insert(catalogInstitutionSources).values({ institutionId: institution.id, sourceId: parsed.sourceId });
    return institution;
  });
}

export async function createProgram(input: unknown) {
  const parsed = programInputSchema.parse(input);
  const [program] = await getDb().insert(catalogPrograms).values(parsed).returning();
  return program;
}

export async function createEvidenceSource(input: unknown) {
  const parsed = evidenceSourceInputSchema.parse(input);
  const [source] = await getDb().insert(catalogEvidenceSources).values(parsed).returning();
  return source;
}

export async function createProgramRevision(input: unknown) {
  const parsed = programRevisionInputSchema.parse(input);
  const [revision] = await getDb().insert(catalogProgramRevisions).values({
    ...parsed,
    effectiveFrom: dateOnly(parsed.effectiveFrom),
    effectiveTo: dateOnly(parsed.effectiveTo),
  }).returning();
  return revision;
}

export async function createIntake(input: unknown) {
  const parsed = intakeInputSchema.parse(input);
  const [intake] = await getDb().insert(catalogProgramIntakes).values({
    ...parsed,
    startsOn: dateOnly(parsed.startsOn),
    applicationDeadline: dateOnly(parsed.applicationDeadline),
  }).returning();
  return intake;
}

export async function createAcademicRequirement(input: unknown) {
  const parsed = academicRequirementInputSchema.parse(input);
  const [requirement] = await getDb().insert(catalogAcademicRequirements).values(parsed).returning();
  return requirement;
}

export async function createProgramFee(input: unknown) {
  const parsed = programFeeInputSchema.parse(input);
  const [fee] = await getDb().insert(catalogProgramFees).values({ ...parsed, amount: String(parsed.amount) }).returning();
  return fee;
}

export async function updateRevisionVerification(id: string, verificationStatus: "unverified" | "in_review" | "verified" | "conflicting" | "stale") {
  const [revision] = await getDb().update(catalogProgramRevisions).set({ verificationStatus, verifiedAt: verificationStatus === "verified" ? new Date() : null }).where(eq(catalogProgramRevisions.id, id)).returning();
  return revision;
}

export async function getSources() {
  return getDb().select().from(catalogEvidenceSources).orderBy(desc(catalogEvidenceSources.retrievedAt)).limit(300);
}

export async function getRevision(id: string) {
  const [revision] = await getDb().select().from(catalogProgramRevisions).where(eq(catalogProgramRevisions.id, id)).limit(1);
  return revision ?? null;
}
