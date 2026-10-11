import { z } from "zod";
import { boolean, check, date, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * This module is intentionally not imported by src/db/schema.ts yet. It can be
 * integrated after the catalog and family-profile branches are merged.
 */

export const catalogDegreeLevel = pgEnum("catalog_degree_level", ["bachelor", "master"]);
export const catalogVerificationStatus = pgEnum("catalog_verification_status", [
  "unverified",
  "in_review",
  "verified",
  "conflicting",
  "stale",
]);
export const catalogAuthorityType = pgEnum("catalog_authority_type", [
  "university",
  "government",
  "accreditor",
  "exam_body",
  "other_official",
]);
export const catalogFeeType = pgEnum("catalog_fee_type", ["international_tuition", "mandatory"]);
export const catalogRequirementType = pgEnum("catalog_requirement_type", [
  "academic",
  "language",
  "entrance_exam",
  "document",
  "other",
]);

export const catalogInstitutions = pgTable(
  "catalog_institutions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Stable, source-independent key used for imports and deduplication. */
    stableKey: text("stable_key").notNull(),
    officialName: text("official_name").notNull(),
    countryCode: text("country_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    stableKeyUnique: uniqueIndex("catalog_institutions_stable_key_idx").on(table.stableKey),
    countryCodeFormat: check("catalog_institutions_country_code_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  }),
);

export const catalogEvidenceSources = pgTable(
  "catalog_evidence_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    publisher: text("publisher").notNull(),
    authorityType: catalogAuthorityType("authority_type").notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceUnique: uniqueIndex("catalog_evidence_sources_url_retrieved_idx").on(table.url, table.retrievedAt),
  }),
);

export const catalogInstitutionSources = pgTable(
  "catalog_institution_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: uuid("institution_id").notNull().references(() => catalogInstitutions.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => catalogEvidenceSources.id, { onDelete: "restrict" }),
    verificationStatus: catalogVerificationStatus("verification_status").notNull().default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    institutionSourceUnique: uniqueIndex("catalog_institution_sources_pair_idx").on(table.institutionId, table.sourceId),
  }),
);

export const catalogPrograms = pgTable(
  "catalog_programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: uuid("institution_id").notNull().references(() => catalogInstitutions.id, { onDelete: "cascade" }),
    /** Stable institution-issued code where available; otherwise an internal stable key. */
    stableKey: text("stable_key").notNull(),
    degreeLevel: catalogDegreeLevel("degree_level").notNull(),
    discipline: text("discipline").notNull(),
    specialization: text("specialization"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    institutionStableKeyUnique: uniqueIndex("catalog_programs_institution_stable_key_idx").on(table.institutionId, table.stableKey),
  }),
);

/** A source-backed snapshot of time-sensitive program facts for one academic year. */
export const catalogProgramRevisions = pgTable(
  "catalog_program_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").notNull().references(() => catalogPrograms.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => catalogEvidenceSources.id, { onDelete: "restrict" }),
    academicYear: text("academic_year").notNull(),
    programTitle: text("program_title").notNull(),
    verificationStatus: catalogVerificationStatus("verification_status").notNull().default("unverified"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    programYearSourceUnique: uniqueIndex("catalog_program_revisions_program_year_source_idx").on(
      table.programId,
      table.academicYear,
      table.sourceId,
    ),
    academicYearFormat: check("catalog_program_revisions_academic_year_check", sql`${table.academicYear} ~ '^[0-9]{4}-[0-9]{4}$'`),
    effectiveRange: check(
      "catalog_program_revisions_effective_range_check",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  }),
);

export const catalogProgramIntakes = pgTable(
  "catalog_program_intakes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull().references(() => catalogProgramRevisions.id, { onDelete: "cascade" }),
    intakeName: text("intake_name").notNull(),
    startsOn: date("starts_on"),
    applicationDeadline: date("application_deadline"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    intakeUnique: uniqueIndex("catalog_program_intakes_revision_name_idx").on(table.revisionId, table.intakeName),
    deadlineBeforeStart: check(
      "catalog_program_intakes_deadline_before_start_check",
      sql`${table.startsOn} is null or ${table.applicationDeadline} is null or ${table.applicationDeadline} <= ${table.startsOn}`,
    ),
  }),
);

export const catalogAcademicRequirements = pgTable(
  "catalog_academic_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull().references(() => catalogProgramRevisions.id, { onDelete: "cascade" }),
    requirementType: catalogRequirementType("requirement_type").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const catalogProgramFees = pgTable(
  "catalog_program_fees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id").notNull().references(() => catalogProgramRevisions.id, { onDelete: "cascade" }),
    feeType: catalogFeeType("fee_type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    feeUnique: uniqueIndex("catalog_program_fees_revision_type_description_idx").on(table.revisionId, table.feeType, table.description),
    amountNonNegative: check("catalog_program_fees_amount_non_negative_check", sql`${table.amount} >= 0`),
    currencyFormat: check("catalog_program_fees_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  }),
);

const stableKeySchema = z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,99}$/, "must be a stable lowercase key");
export const academicYearSchema = z.string().regex(/^(\d{4})-(\d{4})$/).refine((value) => {
  const [start, end] = value.split("-").map(Number);
  return end === start + 1;
}, "must span two consecutive academic years");
const uuidSchema = z.string().uuid();
const isoDateSchema = z.coerce.date();
const currencySchema = z.string().regex(/^[A-Z]{3}$/);

export const institutionInputSchema = z.object({
  stableKey: stableKeySchema,
  officialName: z.string().trim().min(1).max(300),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  sourceId: uuidSchema,
});

export const programInputSchema = z.object({
  institutionId: uuidSchema,
  stableKey: stableKeySchema,
  degreeLevel: z.enum(["bachelor", "master"]),
  discipline: z.string().trim().min(1).max(200),
  specialization: z.string().trim().min(1).max(200).nullable().optional(),
});

export const evidenceSourceInputSchema = z.object({
  url: z.string().url(),
  publisher: z.string().trim().min(1).max(300),
  authorityType: z.enum(["university", "government", "accreditor", "exam_body", "other_official"]),
  retrievedAt: isoDateSchema,
});

export const programRevisionInputSchema = z.object({
  programId: uuidSchema,
  sourceId: uuidSchema,
  academicYear: academicYearSchema,
  programTitle: z.string().trim().min(1).max(300),
  verificationStatus: z.enum(["unverified", "in_review", "verified", "conflicting", "stale"]).default("unverified"),
  retrievedAt: isoDateSchema,
  verifiedAt: isoDateSchema.nullable().optional(),
  effectiveFrom: isoDateSchema.nullable().optional(),
  effectiveTo: isoDateSchema.nullable().optional(),
}).refine(
  (value) => !value.effectiveFrom || !value.effectiveTo || value.effectiveTo >= value.effectiveFrom,
  "effectiveTo must be on or after effectiveFrom",
);

export const intakeInputSchema = z.object({
  revisionId: uuidSchema,
  intakeName: z.string().trim().min(1).max(100),
  startsOn: isoDateSchema.nullable().optional(),
  applicationDeadline: isoDateSchema.nullable().optional(),
}).refine(
  (value) => !value.startsOn || !value.applicationDeadline || value.applicationDeadline <= value.startsOn,
  "applicationDeadline must be on or before startsOn",
);

export const academicRequirementInputSchema = z.object({
  revisionId: uuidSchema,
  requirementType: z.enum(["academic", "language", "entrance_exam", "document", "other"]),
  description: z.string().trim().min(1).max(2000),
});

export const programFeeInputSchema = z.object({
  revisionId: uuidSchema,
  feeType: z.enum(["international_tuition", "mandatory"]),
  amount: z.coerce.number().finite().nonnegative(),
  currency: currencySchema,
  isRequired: z.boolean().default(true),
  description: z.string().trim().min(1).max(500).nullable().optional(),
});

export type InstitutionInput = z.infer<typeof institutionInputSchema>;
export type ProgramInput = z.infer<typeof programInputSchema>;
export type EvidenceSourceInput = z.infer<typeof evidenceSourceInputSchema>;
export type ProgramRevisionInput = z.infer<typeof programRevisionInputSchema>;
export type IntakeInput = z.infer<typeof intakeInputSchema>;
export type AcademicRequirementInput = z.infer<typeof academicRequirementInputSchema>;
export type ProgramFeeInput = z.infer<typeof programFeeInputSchema>;
