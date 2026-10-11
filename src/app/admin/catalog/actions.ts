"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import {
  createAcademicRequirement,
  createEvidenceSource,
  createIntake,
  createInstitution,
  createProgram,
  createProgramFee,
  createProgramRevision,
  updateRevisionVerification,
} from "@/modules/catalog/service";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function dateValue(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

export async function createInstitutionAction(formData: FormData) {
  await requireCatalogAdmin();
  const source = await createEvidenceSource({
    url: text(formData, "sourceUrl"),
    publisher: text(formData, "sourcePublisher"),
    authorityType: text(formData, "authorityType") as "university" | "government" | "accreditor" | "exam_body" | "other_official",
    retrievedAt: text(formData, "sourceRetrievedAt"),
  });
  const institution = await createInstitution({
    stableKey: text(formData, "stableKey"),
    officialName: text(formData, "officialName"),
    countryCode: text(formData, "countryCode").toUpperCase(),
    sourceId: source.id,
  });
  revalidatePath("/admin/catalog");
  redirect(`/admin/catalog/institutions/${institution.id}`);
}

export async function createProgramAction(formData: FormData) {
  await requireCatalogAdmin();
  const program = await createProgram({
    institutionId: text(formData, "institutionId"),
    stableKey: text(formData, "stableKey"),
    degreeLevel: text(formData, "degreeLevel") as "bachelor" | "master",
    discipline: text(formData, "discipline"),
    specialization: nullableText(formData, "specialization"),
  });
  revalidatePath("/admin/catalog/programs");
  redirect(`/admin/catalog/programs/${program.id}`);
}

export async function createSourceAction(formData: FormData) {
  await requireCatalogAdmin();
  await createEvidenceSource({
    url: text(formData, "url"),
    publisher: text(formData, "publisher"),
    authorityType: text(formData, "authorityType") as "university" | "government" | "accreditor" | "exam_body" | "other_official",
    retrievedAt: text(formData, "retrievedAt"),
  });
  revalidatePath("/admin/catalog/programs");
  redirect(`/admin/catalog/programs/${text(formData, "programId")}`);
}

export async function createRevisionAction(formData: FormData) {
  await requireCatalogAdmin();
  await createProgramRevision({
    programId: text(formData, "programId"),
    sourceId: text(formData, "sourceId"),
    academicYear: text(formData, "academicYear"),
    programTitle: text(formData, "programTitle"),
    verificationStatus: "unverified",
    retrievedAt: text(formData, "retrievedAt"),
  });
  revalidatePath(`/admin/catalog/programs/${text(formData, "programId")}`);
  redirect(`/admin/catalog/programs/${text(formData, "programId")}`);
}

export async function createIntakeAction(formData: FormData) {
  await requireCatalogAdmin();
  const programId = text(formData, "programId");
  await createIntake({ revisionId: text(formData, "revisionId"), intakeName: text(formData, "intakeName"), startsOn: dateValue(formData, "startsOn"), applicationDeadline: dateValue(formData, "applicationDeadline") });
  revalidatePath(`/admin/catalog/programs/${programId}`);
  redirect(`/admin/catalog/programs/${programId}`);
}

export async function createRequirementAction(formData: FormData) {
  await requireCatalogAdmin();
  const programId = text(formData, "programId");
  await createAcademicRequirement({ revisionId: text(formData, "revisionId"), requirementType: text(formData, "requirementType") as "academic" | "language" | "entrance_exam" | "document" | "other", description: text(formData, "description") });
  revalidatePath(`/admin/catalog/programs/${programId}`);
  redirect(`/admin/catalog/programs/${programId}`);
}

export async function createFeeAction(formData: FormData) {
  await requireCatalogAdmin();
  const programId = text(formData, "programId");
  await createProgramFee({ revisionId: text(formData, "revisionId"), feeType: text(formData, "feeType") as "international_tuition" | "mandatory", amount: text(formData, "amount"), currency: text(formData, "currency").toUpperCase(), isRequired: formData.get("isRequired") === "on", description: nullableText(formData, "description") });
  revalidatePath(`/admin/catalog/programs/${programId}`);
  redirect(`/admin/catalog/programs/${programId}`);
}

export async function verifyRevisionAction(formData: FormData) {
  await requireCatalogAdmin();
  const programId = text(formData, "programId");
  await updateRevisionVerification(text(formData, "revisionId"), text(formData, "verificationStatus") as "unverified" | "in_review" | "verified" | "conflicting" | "stale");
  revalidatePath(`/admin/catalog/programs/${programId}`);
  redirect(`/admin/catalog/programs/${programId}`);
}
