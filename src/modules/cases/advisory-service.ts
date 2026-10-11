import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  advisorCaseMemory,
  advisorCaseRecommendations,
  advisorCases,
  catalogAcademicRequirements,
  catalogEvidenceSources,
  catalogInstitutionSources,
  catalogInstitutions,
  catalogProgramFees,
  catalogProgramIntakes,
  catalogProgramRevisions,
  catalogPrograms,
} from "@/db/schema";
import { checkCatalogReadiness } from "@/modules/catalog/readiness";
import { refreshCompactBrief, saveMemoryItems } from "./memory";
import { loadCase, type CaseMode } from "./service";
import { qualificationInputSchema, saveRecommendationsInputSchema, searchProgramsInputSchema, type QualificationInput, type SearchProgramsInput } from "./advisory-validation";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function signingSecret() {
  return process.env.AGNI_RECOMMENDATION_KEY ?? process.env.AGNI_CASE_FUNCTION_SECRET ?? "development-only-recommendation-key";
}

function normalized(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function recommendationKey(caseToken: string, revisionId: string) {
  const body = `${caseToken}:${revisionId}`;
  const signature = createHmac("sha256", signingSecret()).update(body).digest("base64url").slice(0, 32);
  return `${Buffer.from(body).toString("base64url")}.${signature}`;
}

function revisionFromKey(caseToken: string, key: string) {
  const [encoded, signature] = key.split(".");
  if (!encoded || !signature) throw new Error("PROGRAM_KEY_INVALID");
  const body = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = createHmac("sha256", signingSecret()).update(body).digest("base64url").slice(0, 32);
  const signatureMatches = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!signatureMatches || body.slice(0, caseToken.length + 1) !== `${caseToken}:`) throw new Error("PROGRAM_KEY_INVALID");
  const revisionId = body.slice(caseToken.length + 1);
  if (!/^[0-9a-f-]{36}$/i.test(revisionId)) throw new Error("PROGRAM_KEY_INVALID");
  return revisionId;
}

function memoryScope(current: { id: string; studentId: string | null }) {
  return current.studentId ? or(eq(advisorCaseMemory.caseId, current.id), eq(advisorCaseMemory.studentId, current.studentId)) : eq(advisorCaseMemory.caseId, current.id);
}

function qualificationFromMemory(items: Array<{ memoryKey: string; value: unknown; statement: string }>) {
  const result: Record<string, unknown> = {};
  for (const item of items) {
    if (item.value !== null && item.value !== undefined) result[item.memoryKey.replace(/^qualification_/, "")] = item.value;
  }
  return result;
}

function mergeQualification(input: QualificationInput, memory: Record<string, unknown>) {
  const result: Record<string, unknown> = { ...memory };
  for (const [key, value] of Object.entries(input)) if (key !== "caseToken" && value !== undefined) result[key] = value;
  return result;
}

function missingQualification(qualification: Record<string, unknown>) {
  const fields: Array<[string, string]> = [
    ["degreeLevel", "degree level"], ["academicBackground", "academic background"], ["grades", "grades or marks"],
    ["specialization", "desired specialization"], ["careerObjectives", "career objectives"], ["countries", "preferred countries"],
    ["intendedIntake", "intended intake"], ["languageDetails", "language results or plan"], ["entranceRequirements", "entrance exam details"],
    ["educationSavingsInr", "education savings"], ["potentialLoanInr", "potential loan"], ["householdIncomeInr", "household income"],
  ];
  return fields.filter(([key]) => qualification[key] === undefined || qualification[key] === null || (Array.isArray(qualification[key]) && qualification[key].length === 0)).map(([, label]) => label);
}

export async function qualifyStudent(mode: CaseMode, input: unknown) {
  const parsed = qualificationInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const current = await loadCase(tx, parsed.caseToken);
    if (current.mode !== mode) throw new Error("CASE_MODE_MISMATCH");
    const existing = await tx.select({ memoryKey: advisorCaseMemory.memoryKey, value: advisorCaseMemory.value, statement: advisorCaseMemory.statement }).from(advisorCaseMemory).where(memoryScope(current)).orderBy(desc(advisorCaseMemory.createdAt)).limit(100);
    const merged = mergeQualification(parsed, qualificationFromMemory(existing));
    const drafts = Object.entries(parsed).filter(([key, value]) => key !== "caseToken" && value !== undefined).map(([key, value]) => ({
      memoryKey: `qualification_${key}`,
      category: ["specialization", "countries", "intendedIntake"].includes(key) ? "preference" as const : "caller_reported" as const,
      status: "active" as const,
      statement: `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`,
      value,
    }));
    if (drafts.length) await saveMemoryItems(tx, { caseId: current.id, studentId: current.studentId, source: "caller" }, drafts);
    const refreshed = await refreshCompactBrief(tx, current);
    return {
      caseToken: parsed.caseToken,
      state: refreshed.status,
      qualification: merged,
      missingInformation: missingQualification(merged),
      note: "Missing information is not treated as a disqualification; it remains to be verified against each program's published requirements.",
    };
  });
}

type ReadyProgram = {
  revision: typeof catalogProgramRevisions.$inferSelect;
  program: typeof catalogPrograms.$inferSelect;
  institution: typeof catalogInstitutions.$inferSelect;
  source: typeof catalogEvidenceSources.$inferSelect;
  intakes: Array<typeof catalogProgramIntakes.$inferSelect>;
  requirements: Array<typeof catalogAcademicRequirements.$inferSelect>;
  fees: Array<Omit<typeof catalogProgramFees.$inferSelect, "amount"> & { amount: number }>;
};

async function loadReadyPrograms(tx: Transaction, asOf = new Date()): Promise<ReadyProgram[]> {
  const rows = await tx.select({ revision: catalogProgramRevisions, program: catalogPrograms, institution: catalogInstitutions, source: catalogEvidenceSources })
    .from(catalogProgramRevisions)
    .innerJoin(catalogPrograms, eq(catalogProgramRevisions.programId, catalogPrograms.id))
    .innerJoin(catalogInstitutions, eq(catalogPrograms.institutionId, catalogInstitutions.id))
    .innerJoin(catalogEvidenceSources, eq(catalogProgramRevisions.sourceId, catalogEvidenceSources.id))
    .innerJoin(catalogInstitutionSources, and(eq(catalogInstitutionSources.institutionId, catalogInstitutions.id), eq(catalogInstitutionSources.sourceId, catalogEvidenceSources.id)))
    .where(and(eq(catalogProgramRevisions.verificationStatus, "verified"), eq(catalogInstitutionSources.verificationStatus, "verified")));
  const revisionIds = rows.map((row) => row.revision.id);
  if (!revisionIds.length) return [];
  const [intakes, requirements, fees] = await Promise.all([
    tx.select().from(catalogProgramIntakes).where(inArray(catalogProgramIntakes.revisionId, revisionIds)),
    tx.select().from(catalogAcademicRequirements).where(inArray(catalogAcademicRequirements.revisionId, revisionIds)),
    tx.select().from(catalogProgramFees).where(inArray(catalogProgramFees.revisionId, revisionIds)),
  ]);
  return rows.map((row) => {
    const rowIntakes = intakes.filter((item) => item.revisionId === row.revision.id);
    const rowRequirements = requirements.filter((item) => item.revisionId === row.revision.id);
    const rowFees = fees.filter((item) => item.revisionId === row.revision.id).map((fee) => ({ ...fee, amount: Number(fee.amount) }));
    const readiness = checkCatalogReadiness({ academicYear: row.revision.academicYear, intakes: rowIntakes, requirements: rowRequirements, fees: rowFees, verificationStatus: row.revision.verificationStatus, verifiedAt: row.revision.verifiedAt, retrievedAt: row.revision.retrievedAt, effectiveTo: row.revision.effectiveTo, sourceUrl: row.source.url }, asOf);
    return readiness.ready ? { ...row, intakes: rowIntakes, requirements: rowRequirements, fees: rowFees } : null;
  }).filter((row): row is ReadyProgram => row !== null);
}

function countryMatches(countryCode: string, requested: string[]) {
  const aliases: Record<string, string[]> = { us: ["us", "usa", "united states", "america"], gb: ["uk", "united kingdom", "england", "great britain"], de: ["germany", "de"], ca: ["canada", "ca"], au: ["australia", "au"], in: ["india", "in"] };
  return requested.some((value) => (aliases[countryCode.toLowerCase()] ?? [countryCode.toLowerCase()]).includes(normalized(value)));
}

function evaluateProgram(program: ReadyProgram, qualification: Record<string, unknown>) {
  const requirements = program.requirements.map((item) => ({ type: item.requirementType, description: item.description }));
  const missing: string[] = [];
  if (requirements.some((item) => item.type === "academic") && !qualification.academicBackground && !qualification.grades) missing.push("academic background or grades");
  if (requirements.some((item) => item.type === "language") && !qualification.languageDetails) missing.push("language evidence");
  if (requirements.some((item) => item.type === "entrance_exam") && !qualification.entranceRequirements) missing.push("entrance exam evidence");
  const tuition = program.fees.filter((fee) => fee.feeType === "international_tuition");
  const mandatory = program.fees.filter((fee) => fee.feeType === "mandatory");
  const savings = typeof qualification.educationSavingsInr === "number" ? qualification.educationSavingsInr : 0;
  const loan = typeof qualification.potentialLoanInr === "number" ? qualification.potentialLoanInr : 0;
  const financialGap = tuition.every((fee) => fee.currency === "INR") && (qualification.educationSavingsInr !== undefined || qualification.potentialLoanInr !== undefined) && tuition[0] && tuition[0].amount > savings + loan ? tuition[0].amount - savings - loan : null;
  return {
    eligibility: missing.length ? "needs_verification" as const : "possible_match" as const,
    missingEvidence: missing,
    publishedRequirements: requirements,
    timeline: program.intakes.map((item) => ({ intakeName: item.intakeName, startsOn: item.startsOn, applicationDeadline: item.applicationDeadline })),
    fees: { tuition: tuition.map((fee) => ({ amount: fee.amount, currency: fee.currency, description: fee.description })), mandatory: mandatory.map((fee) => ({ amount: fee.amount, currency: fee.currency, description: fee.description })) },
    financialGap: financialGap === null ? { status: "unknown", reason: "A comparable INR funding and tuition basis was not available." } : { status: "gap_identified", amountInr: financialGap, reason: "This is a simple tuition-versus-declared-savings-and-loan comparison, not an affordability or admission decision." },
    unknowns: ["admission probability", "living costs", "scholarships", "outcomes", "fee period unless stated by the source"],
  };
}

function qualificationForSearch(input: SearchProgramsInput, memory: Array<{ memoryKey: string; value: unknown; statement: string }>) {
  return mergeQualification(input as QualificationInput, qualificationFromMemory(memory));
}

export async function searchPrograms(mode: CaseMode, input: unknown) {
  const parsed = searchProgramsInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const current = await loadCase(tx, parsed.caseToken);
    if (current.mode !== mode) throw new Error("CASE_MODE_MISMATCH");
    const memory = await tx.select({ memoryKey: advisorCaseMemory.memoryKey, value: advisorCaseMemory.value, statement: advisorCaseMemory.statement }).from(advisorCaseMemory).where(memoryScope(current)).orderBy(desc(advisorCaseMemory.createdAt)).limit(100);
    const qualification = qualificationForSearch(parsed, memory);
    const programs = await loadReadyPrograms(tx);
    const requestedCountries = Array.isArray(qualification.countries) ? qualification.countries.filter((item): item is string => typeof item === "string") : [];
    const degreeLevel = qualification.degreeLevel;
    const specialization = typeof qualification.specialization === "string" ? normalized(qualification.specialization) : "";
    const query = typeof qualification.query === "string" ? normalized(qualification.query) : "";
    const intendedIntake = typeof qualification.intendedIntake === "string" ? normalized(qualification.intendedIntake) : "";
    const matches = programs.filter((item) => {
      if (degreeLevel && item.program.degreeLevel !== degreeLevel) return false;
      if (requestedCountries.length && !countryMatches(item.institution.countryCode, requestedCountries)) return false;
      if (specialization && !normalized(`${item.program.discipline} ${item.program.specialization ?? ""} ${item.revision.programTitle}`).includes(specialization)) return false;
      if (query && !normalized(`${item.institution.officialName} ${item.program.discipline} ${item.program.specialization ?? ""} ${item.revision.programTitle}`).includes(query)) return false;
      if (intendedIntake && !item.intakes.some((intake) => normalized(intake.intakeName).includes(intendedIntake))) return false;
      return true;
    }).slice(0, parsed.maxResults);
    return {
      caseToken: parsed.caseToken,
      state: current.status,
      results: matches.map((item) => ({
        programKey: recommendationKey(parsed.caseToken, item.revision.id),
        sourceRevisionId: item.revision.id,
        institution: { name: item.institution.officialName, countryCode: item.institution.countryCode },
        program: { title: item.revision.programTitle, degreeLevel: item.program.degreeLevel, discipline: item.program.discipline, specialization: item.program.specialization },
        academicYear: item.revision.academicYear,
        assessment: evaluateProgram(item, qualification),
        sources: [{ url: item.source.url, publisher: item.source.publisher, retrievedAt: item.source.retrievedAt.toISOString(), verifiedAt: item.revision.verifiedAt?.toISOString() ?? null }],
      })),
      note: matches.length ? "Results contain only current catalog revisions that passed verification and readiness checks." : "No verified/current catalog result matched the supplied criteria; no program has been invented.",
    };
  });
}

export async function saveRecommendations(mode: CaseMode, input: unknown) {
  const parsed = saveRecommendationsInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    const current = await loadCase(tx, parsed.caseToken);
    if (current.mode !== mode) throw new Error("CASE_MODE_MISMATCH");
    const saved = [];
    for (const recommendation of parsed.recommendations) {
      const revisionId = revisionFromKey(parsed.caseToken, recommendation.programKey);
      const [revision] = await tx.select({ id: catalogProgramRevisions.id }).from(catalogProgramRevisions).where(and(eq(catalogProgramRevisions.id, revisionId), eq(catalogProgramRevisions.verificationStatus, "verified"))).limit(1);
      if (!revision) throw new Error("PROGRAM_UNAVAILABLE");
      const [row] = await tx.insert(advisorCaseRecommendations).values({ caseId: current.id, studentId: current.studentId, revisionId, rationale: recommendation.rationale, assessment: recommendation.assessment ?? null, status: "saved", updatedAt: new Date() }).onConflictDoUpdate({ target: [advisorCaseRecommendations.caseId, advisorCaseRecommendations.revisionId], set: { rationale: recommendation.rationale, assessment: recommendation.assessment ?? null, status: "saved", updatedAt: new Date() } }).returning({ id: advisorCaseRecommendations.id, revisionId: advisorCaseRecommendations.revisionId, status: advisorCaseRecommendations.status });
      saved.push(row);
    }
    await tx.update(advisorCases).set({ updatedAt: new Date(), lastActivityAt: new Date() }).where(eq(advisorCases.id, current.id));
    return { caseToken: parsed.caseToken, saved };
  });
}
