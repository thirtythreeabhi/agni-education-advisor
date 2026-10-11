import { and, asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { advisorCaseRecommendations, advisorCases, consultations, consultationExtractions, consultationProfileProposals, familyAuditEvents, families, familyEducationFinances, students, studentConsultations, users } from "@/db/schema";
import { buildProfileProposals, isProfileField, type FamilyFinanceField } from "./association";
import { consultationAssociationInputSchema } from "@/modules/families/validation";
import { z } from "zod";
import { consolidateConsultationMemory, refreshCompactBrief } from "@/modules/cases/memory";

const resolveProposalInputSchema = z.object({
  proposalId: z.string().uuid(),
  decision: z.enum(["keep_existing", "reject_extracted", "apply_corrected"]),
  correctedValue: z.unknown().optional(),
});

type AdminTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function assertAdmin(tx: AdminTransaction, actorUserId: string) {
  const [actor] = await tx.select({ role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, actorUserId)).limit(1);
  if (!actor || !actor.isActive || actor.role !== "admin") throw new Error("ADMIN_REQUIRED");
}

function coerceStudentValue(fieldName: string, value: unknown) {
  if (value === null || value === undefined) throw new Error("PROPOSAL_VALUE_MISSING");
  if (fieldName === "preferredCountries") {
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
    if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
    throw new Error("PROPOSAL_VALUE_INVALID");
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  throw new Error("PROPOSAL_VALUE_INVALID");
}

function coerceFinanceValue(_fieldName: FamilyFinanceField, value: unknown) {
  if (value === null || value === undefined || value === "") throw new Error("PROPOSAL_VALUE_MISSING");
  const numberValue = typeof value === "number" ? value : typeof value === "string" && /^[₹,\s\d]+$/.test(value.trim()) ? Number(value.replace(/[₹,\s,]/g, "")) : NaN;
  if (!Number.isSafeInteger(numberValue) || numberValue < 0) throw new Error("PROPOSAL_VALUE_INVALID");
  return numberValue;
}

export async function listStudentsForAdmin(search = "") {
  const db = getDb();
  const term = search.trim();
  const where = term ? or(ilike(students.firstName, `%${term}%`), ilike(students.lastName, `%${term}%`), ilike(families.name, `%${term}%`)) : undefined;
  return db.select({ id: students.id, firstName: students.firstName, lastName: students.lastName, familyId: families.id, familyName: families.name }).from(students).innerJoin(families, eq(students.familyId, families.id)).where(where).orderBy(asc(families.name), asc(students.firstName)).limit(100);
}

export async function getConsultationReview(consultationId: string) {
  const db = getDb();
  const [consultation] = await db.select().from(consultations).where(eq(consultations.id, consultationId)).limit(1);
  if (!consultation) return undefined;
  const [extractions, association, proposals] = await Promise.all([
    db.select().from(consultationExtractions).where(eq(consultationExtractions.consultationId, consultationId)).orderBy(asc(consultationExtractions.fieldName)),
    db.select({ student: students, family: families }).from(studentConsultations).innerJoin(students, eq(studentConsultations.studentId, students.id)).innerJoin(families, eq(students.familyId, families.id)).where(eq(studentConsultations.consultationId, consultationId)).limit(1),
    db.select().from(consultationProfileProposals).where(eq(consultationProfileProposals.consultationId, consultationId)).orderBy(desc(consultationProfileProposals.createdAt)),
  ]);
  return { consultation, extractions, association: association[0], proposals };
}

export async function associateConsultationAsAdmin(actorUserId: string, input: unknown) {
  const values = consultationAssociationInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await assertAdmin(tx, actorUserId);
    const [consultation] = await tx.select().from(consultations).where(eq(consultations.id, values.consultationId)).limit(1);
    if (!consultation) throw new Error("CONSULTATION_NOT_FOUND");
    const [student] = await tx.select({ student: students, familyId: families.id }).from(students).innerJoin(families, eq(students.familyId, families.id)).where(eq(students.id, values.studentId)).limit(1);
    if (!student) throw new Error("STUDENT_NOT_FOUND");
    const [existingAssociation] = await tx.select().from(studentConsultations).where(eq(studentConsultations.consultationId, values.consultationId)).limit(1);
    if (existingAssociation) {
      if (existingAssociation.studentId === values.studentId) {
        const [caseRecord] = await tx.select().from(advisorCases).where(eq(advisorCases.studentId, values.studentId)).orderBy(desc(advisorCases.updatedAt)).limit(1);
        await consolidateConsultationMemory(tx, { consultationId: values.consultationId, studentId: values.studentId, caseId: caseRecord?.id, analysis: consultation.postCallAnalysis });
        if (caseRecord) await tx.update(advisorCaseRecommendations).set({ sourceConsultationId: values.consultationId, updatedAt: new Date() }).where(and(eq(advisorCaseRecommendations.caseId, caseRecord.id), isNull(advisorCaseRecommendations.sourceConsultationId)));
        if (caseRecord) await refreshCompactBrief(tx, caseRecord);
        return { duplicate: true, studentId: values.studentId };
      }
      throw new Error("CONSULTATION_ALREADY_ASSOCIATED");
    }
    const extractions = await tx.select().from(consultationExtractions).where(eq(consultationExtractions.consultationId, values.consultationId));
    const [finances] = await tx.select().from(familyEducationFinances).where(eq(familyEducationFinances.familyId, student.familyId)).limit(1);
    const proposals = buildProfileProposals(extractions, student.student, finances ?? null);
    await tx.insert(studentConsultations).values({ studentId: values.studentId, consultationId: values.consultationId, associatedByUserId: actorUserId });
    await tx.update(consultations).set({ associationStatus: "associated", updatedAt: new Date() }).where(eq(consultations.id, values.consultationId));
    if (proposals.length) await tx.insert(consultationProfileProposals).values(proposals.map((proposal) => ({ ...proposal, consultationId: values.consultationId, studentId: values.studentId })));
    const [caseRecord] = await tx.select().from(advisorCases).where(eq(advisorCases.studentId, values.studentId)).orderBy(desc(advisorCases.updatedAt)).limit(1);
    await consolidateConsultationMemory(tx, { consultationId: values.consultationId, studentId: values.studentId, caseId: caseRecord?.id, analysis: consultation.postCallAnalysis });
    if (caseRecord) await tx.update(advisorCaseRecommendations).set({ sourceConsultationId: values.consultationId, updatedAt: new Date() }).where(and(eq(advisorCaseRecommendations.caseId, caseRecord.id), isNull(advisorCaseRecommendations.sourceConsultationId)));
    if (caseRecord) await refreshCompactBrief(tx, caseRecord);
    await tx.insert(familyAuditEvents).values([
      { familyId: student.familyId, studentId: values.studentId, consultationId: values.consultationId, actorUserId, eventType: "consultation_associated", changes: { source: "admin_review" } },
      { familyId: student.familyId, studentId: values.studentId, consultationId: values.consultationId, actorUserId, eventType: "consultation_profile_proposed", changes: { proposalCount: proposals.length } },
    ]);
    return { duplicate: false, studentId: values.studentId, proposalCount: proposals.length };
  });
}

export async function resolveProfileProposal(actorUserId: string, input: unknown) {
  const values = resolveProposalInputSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await assertAdmin(tx, actorUserId);
    const [row] = await tx.select({ proposal: consultationProfileProposals, familyId: families.id }).from(consultationProfileProposals).innerJoin(students, eq(consultationProfileProposals.studentId, students.id)).innerJoin(families, eq(students.familyId, families.id)).where(eq(consultationProfileProposals.id, values.proposalId)).limit(1);
    if (!row) throw new Error("PROPOSAL_NOT_FOUND");
    if (row.proposal.state === "accepted" || row.proposal.state === "rejected") return { idempotent: true, state: row.proposal.state };
    if (values.decision === "keep_existing" || values.decision === "reject_extracted") {
      await tx.update(consultationProfileProposals).set({ state: "rejected", resolvedByUserId: actorUserId, resolvedAt: new Date(), updatedAt: new Date() }).where(eq(consultationProfileProposals.id, values.proposalId));
      await tx.insert(familyAuditEvents).values({ familyId: row.familyId, studentId: row.proposal.studentId, consultationId: row.proposal.consultationId, actorUserId, eventType: "consultation_profile_rejected", changes: { proposalId: values.proposalId, fieldName: row.proposal.fieldName, decision: values.decision, existingValue: row.proposal.existingValue, extractedValue: row.proposal.proposedValue } });
      return { idempotent: false, state: "rejected" as const };
    }
    if (values.decision !== "apply_corrected") throw new Error("PROPOSAL_DECISION_INVALID");
    if (row.proposal.state === "unmapped") throw new Error("PROPOSAL_NOT_MAPPABLE");
    if (values.correctedValue === undefined || values.correctedValue === null || values.correctedValue === "") throw new Error("CORRECTED_VALUE_REQUIRED");
    if (row.proposal.familyFinanceFieldName) {
      const value = coerceFinanceValue(row.proposal.familyFinanceFieldName as FamilyFinanceField, values.correctedValue);
      const existing = await tx.select().from(familyEducationFinances).where(eq(familyEducationFinances.familyId, row.familyId)).limit(1);
      if (existing[0]) await tx.update(familyEducationFinances).set({ [row.proposal.familyFinanceFieldName]: value, [`${row.proposal.familyFinanceFieldName.replace(/Inr$/, "")}State`]: "confirmed", updatedAt: new Date() }).where(eq(familyEducationFinances.familyId, row.familyId));
      else await tx.insert(familyEducationFinances).values({ familyId: row.familyId, [row.proposal.familyFinanceFieldName]: value, [`${row.proposal.familyFinanceFieldName.replace(/Inr$/, "")}State`]: "confirmed" });
      await tx.update(consultationProfileProposals).set({ state: "accepted", resolvedByUserId: actorUserId, resolvedAt: new Date(), updatedAt: new Date() }).where(eq(consultationProfileProposals.id, values.proposalId));
      await tx.insert(familyAuditEvents).values({ familyId: row.familyId, studentId: row.proposal.studentId, consultationId: row.proposal.consultationId, actorUserId, eventType: "consultation_profile_accepted", changes: { proposalId: values.proposalId, decision: values.decision, fieldName: row.proposal.familyFinanceFieldName, from: row.proposal.existingValue, extractedValue: row.proposal.proposedValue, to: value } });
      return { idempotent: false, state: "accepted" as const };
    }
    if (!row.proposal.studentFieldName || !isProfileField(row.proposal.studentFieldName)) throw new Error("PROPOSAL_NOT_MAPPABLE");
    const value = coerceStudentValue(row.proposal.studentFieldName, values.correctedValue);
    const [student] = await tx.update(students).set({ [row.proposal.studentFieldName]: value, updatedAt: new Date() }).where(eq(students.id, row.proposal.studentId)).returning();
    await tx.update(consultationProfileProposals).set({ state: "accepted", resolvedByUserId: actorUserId, resolvedAt: new Date(), updatedAt: new Date() }).where(eq(consultationProfileProposals.id, values.proposalId));
    await tx.insert(familyAuditEvents).values([
      { familyId: row.familyId, studentId: row.proposal.studentId, consultationId: row.proposal.consultationId, actorUserId, eventType: "consultation_profile_accepted", changes: { proposalId: values.proposalId, decision: values.decision, fieldName: row.proposal.studentFieldName, from: row.proposal.existingValue, extractedValue: row.proposal.proposedValue, to: value } },
      { familyId: row.familyId, studentId: row.proposal.studentId, actorUserId, eventType: "student_updated", changes: { source: "consultation_profile_proposal", proposalId: values.proposalId } },
    ]);
    return { idempotent: false, state: "accepted" as const, student };
  });
}
