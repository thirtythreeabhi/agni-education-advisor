import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  catalogAcademicRequirements,
  catalogEvidenceSources,
  catalogInstitutionSources,
  catalogInstitutions,
  catalogProgramFees,
  catalogProgramIntakes,
  catalogProgramRevisions,
  catalogPrograms,
} from "./schema";
import {
  previewCatalogImport,
  type CatalogImportError,
  type CatalogImportRecord,
} from "./import-schema";

export type ImportPreview = ReturnType<typeof previewCatalogImport> & {
  databaseMatches?: Array<{ recordIndex: number; institution: "new" | "existing"; program: "new" | "existing"; revision: "new" | "existing" }>;
};

export async function previewCatalogImportAgainstDatabase(input: unknown): Promise<ImportPreview> {
  const preview = previewCatalogImport(input);
  if (preview.validRecords.length === 0) return preview;
  const errors = [...preview.errors];
  const databaseMatches: NonNullable<ImportPreview["databaseMatches"]> = [];
  for (const [offset, record] of preview.validRecords.entries()) {
    const recordIndex = preview.validRecordIndexes[offset];
    const [institution] = await getDb().select({ id: catalogInstitutions.id, officialName: catalogInstitutions.officialName, countryCode: catalogInstitutions.countryCode }).from(catalogInstitutions).where(eq(catalogInstitutions.stableKey, record.institution.stableKey)).limit(1);
    const [source] = await getDb().select({ id: catalogEvidenceSources.id, publisher: catalogEvidenceSources.publisher, authorityType: catalogEvidenceSources.authorityType }).from(catalogEvidenceSources).where(and(eq(catalogEvidenceSources.url, record.source.url), eq(catalogEvidenceSources.retrievedAt, record.source.retrievedAt))).limit(1);
    const [program] = institution ? await getDb().select({ id: catalogPrograms.id, degreeLevel: catalogPrograms.degreeLevel, discipline: catalogPrograms.discipline, specialization: catalogPrograms.specialization }).from(catalogPrograms).where(and(eq(catalogPrograms.institutionId, institution.id), eq(catalogPrograms.stableKey, record.program.stableKey))).limit(1) : [];
    const [revision] = program && source ? await getDb().select({ id: catalogProgramRevisions.id, programTitle: catalogProgramRevisions.programTitle, effectiveFrom: catalogProgramRevisions.effectiveFrom, effectiveTo: catalogProgramRevisions.effectiveTo }).from(catalogProgramRevisions).where(and(eq(catalogProgramRevisions.programId, program.id), eq(catalogProgramRevisions.academicYear, record.academicYear), eq(catalogProgramRevisions.sourceId, source.id))).limit(1) : [];
    if (institution && (institution.officialName !== record.institution.officialName || institution.countryCode !== record.institution.countryCode)) errors.push({ recordIndex, path: "institution", message: "Existing institution stable key has conflicting metadata." });
    if (source && (source.publisher !== record.source.publisher || source.authorityType !== record.source.authorityType)) errors.push({ recordIndex, path: "source", message: "Existing source identity has conflicting metadata." });
    if (program && (program.degreeLevel !== record.program.degreeLevel || program.discipline !== record.program.discipline || (program.specialization ?? null) !== (record.program.specialization ?? null))) errors.push({ recordIndex, path: "program", message: "Existing program stable key has conflicting metadata." });
    if (revision && (revision.programTitle !== record.program.title || revision.effectiveFrom !== (record.effectiveFrom ?? null) || revision.effectiveTo !== (record.effectiveTo ?? null))) errors.push({ recordIndex, path: "revision", message: "Existing revision identity has conflicting metadata." });
    databaseMatches.push({ recordIndex, institution: institution ? "existing" : "new", program: program ? "existing" : "new", revision: revision ? "existing" : "new" });
  }
  return { ...preview, errors, databaseMatches };
}

type CatalogTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function feeKey(feeType: "international_tuition" | "mandatory", description: string | null | undefined) {
  return `${feeType}:${description ?? "default"}`;
}

async function importRecord(tx: CatalogTransaction, record: CatalogImportRecord) {
  let [institution] = await tx.select().from(catalogInstitutions).where(eq(catalogInstitutions.stableKey, record.institution.stableKey)).limit(1);
  let createdInstitution = false;
  if (!institution) {
    await tx.insert(catalogInstitutions).values(record.institution).onConflictDoNothing({ target: catalogInstitutions.stableKey });
    [institution] = await tx.select().from(catalogInstitutions).where(eq(catalogInstitutions.stableKey, record.institution.stableKey)).limit(1);
    createdInstitution = true;
  }
  if (!institution) throw new Error("institution insert failed");
  if (institution.officialName !== record.institution.officialName || institution.countryCode !== record.institution.countryCode) throw new Error("institution metadata conflicts with an existing stable key");

  let [source] = await tx.select().from(catalogEvidenceSources).where(and(eq(catalogEvidenceSources.url, record.source.url), eq(catalogEvidenceSources.retrievedAt, record.source.retrievedAt))).limit(1);
  if (!source) {
    await tx.insert(catalogEvidenceSources).values(record.source).onConflictDoNothing({ target: [catalogEvidenceSources.url, catalogEvidenceSources.retrievedAt] });
    [source] = await tx.select().from(catalogEvidenceSources).where(and(eq(catalogEvidenceSources.url, record.source.url), eq(catalogEvidenceSources.retrievedAt, record.source.retrievedAt))).limit(1);
  }
  if (!source) throw new Error("source insert failed");
  if (source.publisher !== record.source.publisher || source.authorityType !== record.source.authorityType) throw new Error("source metadata conflicts with an existing source");
  await tx.insert(catalogInstitutionSources).values({ institutionId: institution.id, sourceId: source.id }).onConflictDoNothing({ target: [catalogInstitutionSources.institutionId, catalogInstitutionSources.sourceId] });

  let [program] = await tx.select().from(catalogPrograms).where(and(eq(catalogPrograms.institutionId, institution.id), eq(catalogPrograms.stableKey, record.program.stableKey))).limit(1);
  let createdProgram = false;
  if (!program) {
    await tx.insert(catalogPrograms).values({ institutionId: institution.id, stableKey: record.program.stableKey, degreeLevel: record.program.degreeLevel, discipline: record.program.discipline, specialization: record.program.specialization }).onConflictDoNothing({ target: [catalogPrograms.institutionId, catalogPrograms.stableKey] });
    [program] = await tx.select().from(catalogPrograms).where(and(eq(catalogPrograms.institutionId, institution.id), eq(catalogPrograms.stableKey, record.program.stableKey))).limit(1);
    createdProgram = true;
  }
  if (!program) throw new Error("program insert failed");
  if (program.degreeLevel !== record.program.degreeLevel || program.discipline !== record.program.discipline || (program.specialization ?? null) !== (record.program.specialization ?? null)) throw new Error("program metadata conflicts with an existing stable key");

  let [revision] = await tx.select().from(catalogProgramRevisions).where(and(eq(catalogProgramRevisions.programId, program.id), eq(catalogProgramRevisions.academicYear, record.academicYear), eq(catalogProgramRevisions.sourceId, source.id))).limit(1);
  let createdRevision = false;
  if (!revision) {
    await tx.insert(catalogProgramRevisions).values({ programId: program.id, sourceId: source.id, academicYear: record.academicYear, programTitle: record.program.title, verificationStatus: "unverified", retrievedAt: record.source.retrievedAt, effectiveFrom: record.effectiveFrom, effectiveTo: record.effectiveTo }).onConflictDoNothing({ target: [catalogProgramRevisions.programId, catalogProgramRevisions.academicYear, catalogProgramRevisions.sourceId] });
    [revision] = await tx.select().from(catalogProgramRevisions).where(and(eq(catalogProgramRevisions.programId, program.id), eq(catalogProgramRevisions.academicYear, record.academicYear), eq(catalogProgramRevisions.sourceId, source.id))).limit(1);
    createdRevision = true;
  }
  if (!revision) throw new Error("revision insert failed");
  if (revision.programTitle !== record.program.title || revision.effectiveFrom !== (record.effectiveFrom ?? null) || revision.effectiveTo !== (record.effectiveTo ?? null)) throw new Error("revision metadata conflicts with an existing source-backed revision");

  for (const intake of record.intakes) {
    const [existing] = await tx.select({ id: catalogProgramIntakes.id }).from(catalogProgramIntakes).where(and(eq(catalogProgramIntakes.revisionId, revision.id), eq(catalogProgramIntakes.intakeName, intake.intakeName))).limit(1);
    if (existing) {
      const [existingIntake] = await tx.select().from(catalogProgramIntakes).where(eq(catalogProgramIntakes.id, existing.id)).limit(1);
      if (existingIntake.startsOn !== (intake.startsOn ?? null) || existingIntake.applicationDeadline !== (intake.applicationDeadline ?? null)) throw new Error("intake dates conflict with an existing intake");
    }
    if (!existing) await tx.insert(catalogProgramIntakes).values({ revisionId: revision.id, intakeName: intake.intakeName, startsOn: intake.startsOn, applicationDeadline: intake.applicationDeadline });
  }
  for (const requirement of record.requirements) {
    const [existing] = await tx.select({ id: catalogAcademicRequirements.id }).from(catalogAcademicRequirements).where(and(eq(catalogAcademicRequirements.revisionId, revision.id), eq(catalogAcademicRequirements.requirementType, requirement.requirementType), eq(catalogAcademicRequirements.description, requirement.description))).limit(1);
    if (!existing) await tx.insert(catalogAcademicRequirements).values({ revisionId: revision.id, requirementType: requirement.requirementType, description: requirement.description });
  }
  for (const fee of record.fees) {
    const key = feeKey(fee.feeType, fee.description);
    const [existing] = await tx.select().from(catalogProgramFees).where(and(eq(catalogProgramFees.revisionId, revision.id), eq(catalogProgramFees.feeKey, key))).limit(1);
    if (existing && (existing.amount !== String(fee.amount) || existing.currency !== fee.currency)) throw new Error("fee conflicts with an existing fee key");
    if (!existing) await tx.insert(catalogProgramFees).values({ revisionId: revision.id, feeType: fee.feeType, amount: String(fee.amount), currency: fee.currency, description: fee.description ?? null, feeKey: key, isRequired: true });
  }
  return { createdInstitution, createdProgram, createdRevision };
}

export async function executeCatalogImport(input: unknown) {
  const preview = previewCatalogImport(input);
  const errors: CatalogImportError[] = [...preview.errors];
  if (errors.length > 0) return { totalRecords: preview.totalRecords, imported: 0, skipped: 0, errors };
  let imported = 0;
  let skipped = 0;
  for (const [offset, record] of preview.validRecords.entries()) {
    const recordIndex = preview.validRecordIndexes[offset];
    try {
      const result = await getDb().transaction((tx) => importRecord(tx, record));
      if (result.createdInstitution || result.createdProgram || result.createdRevision) imported += 1;
      else skipped += 1;
    } catch {
      errors.push({ recordIndex, path: "record", message: "Record could not be imported; no existing record was overwritten." });
    }
  }
  return { totalRecords: preview.totalRecords, imported, skipped, errors };
}
