import { relations, sql } from "drizzle-orm";
import { catalogProgramRevisions } from "../modules/catalog/schema";
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const processingStatus = pgEnum("processing_status", ["received", "processing", "processed", "failed"]);
export const associationStatus = pgEnum("association_status", ["unassociated", "associated"]);
export const extractionState = pgEnum("extraction_state", ["confirmed", "missing", "review"]);
export const userRole = pgEnum("user_role", ["admin", "user"]);
export const financeFieldState = pgEnum("finance_field_state", ["confirmed", "unknown", "review"]);
export const familyAuditEventType = pgEnum("family_audit_event_type", [
  "family_created",
  "family_updated",
  "student_created",
  "student_updated",
  "education_finances_updated",
  "consultation_associated",
  "consultation_disassociated",
  "consultation_profile_proposed",
  "consultation_profile_accepted",
  "consultation_profile_rejected",
]);
export const proposalState = pgEnum("proposal_state", ["pending", "conflict", "accepted", "rejected", "unmapped"]);
export const advisorCaseMode = pgEnum("advisor_case_mode", ["demo", "guest", "private"]);
export const advisorCaseStatus = pgEnum("advisor_case_status", ["provisional", "ambiguous", "resolved", "expired", "closed"]);
export const advisorCaseAuthorization = pgEnum("advisor_case_authorization", ["none", "pending", "verified", "denied"]);
export const advisorCaseEventActor = pgEnum("advisor_case_event_actor", ["caller", "function", "system", "admin"]);
export const advisorMemoryCategory = pgEnum("advisor_memory_category", ["confirmed_profile", "caller_reported", "preference", "decision", "proposed_change", "unresolved_question", "promised_action", "follow_up_outcome", "discussed_university"]);
export const advisorMemoryStatus = pgEnum("advisor_memory_status", ["active", "resolved", "superseded", "rejected", "uncertain", "conflicted"]);
export const advisorMemorySource = pgEnum("advisor_memory_source", ["caller", "function", "webhook_extraction", "admin", "system"]);
export const advisorRecommendationStatus = pgEnum("advisor_recommendation_status", ["saved", "dismissed"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email"),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailUnique: uniqueIndex("users_email_unique_idx").on(table.email),
  phoneUnique: uniqueIndex("users_phone_unique_idx").on(table.phone),
  identifierRequired: check("users_identifier_required", sql`${table.email} is not null or ${table.phone} is not null`),
}));

export const authRateLimits = pgTable("auth_rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenHashUnique: uniqueIndex("password_reset_tokens_hash_unique_idx").on(table.tokenHash),
  userCreatedIndex: index("password_reset_tokens_user_created_idx").on(table.userId, table.createdAt),
}));

export const consultations = pgTable("consultations", {
  id: uuid("id").defaultRandom().primaryKey(),
  agniSessionId: text("agni_session_id").notNull().unique(),
  agentId: text("agent_id"),
  agniStatus: text("agni_status"),
  durationSec: integer("duration_sec"),
  disconnectReason: text("disconnect_reason"),
  postCallAnalysis: jsonb("post_call_analysis"),
  transcriptions: jsonb("transcriptions"),
  processingStatus: processingStatus("processing_status").notNull().default("received"),
  processingError: text("processing_error"),
  associationStatus: associationStatus("association_status").notNull().default("unassociated"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultationExtractions = pgTable("consultation_extractions", {
  id: uuid("id").defaultRandom().primaryKey(),
  consultationId: uuid("consultation_id").notNull().references(() => consultations.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(),
  originalValue: jsonb("original_value"),
  normalizedValue: jsonb("normalized_value"),
  state: extractionState("state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  consultationFieldUnique: uniqueIndex("consultation_extractions_consultation_field_idx").on(table.consultationId, table.fieldName),
}));

export const consultationsRelations = relations(consultations, ({ many }) => ({
  extractions: many(consultationExtractions),
}));

export const consultationExtractionsRelations = relations(consultationExtractions, ({ one }) => ({
  consultation: one(consultations, { fields: [consultationExtractions.consultationId], references: [consultations.id] }),
}));

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  currentGrade: text("current_grade"),
  schoolName: text("school_name"),
  academicSummary: text("academic_summary"),
  desiredDegree: text("desired_degree"),
  specialization: text("specialization"),
  careerGoals: text("career_goals"),
  preferredCountries: text("preferred_countries").array().notNull().default(sql`'{}'::text[]`),
  preferredIntake: text("preferred_intake"),
  graduationYear: integer("graduation_year"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const familyEducationFinances = pgTable("family_education_finances", {
  familyId: uuid("family_id").primaryKey().references(() => families.id, { onDelete: "cascade" }),
  annualBudgetMinor: integer("annual_budget_minor"),
  annualBudgetCurrency: text("annual_budget_currency"),
  annualBudgetState: financeFieldState("annual_budget_state").notNull().default("unknown"),
  educationSavingsInr: integer("education_savings_inr"),
  educationSavingsState: financeFieldState("education_savings_state").notNull().default("unknown"),
  proposedLoanInr: integer("proposed_loan_inr"),
  proposedLoanState: financeFieldState("proposed_loan_state").notNull().default("unknown"),
  annualHouseholdIncomeInr: integer("annual_household_income_inr"),
  annualHouseholdIncomeState: financeFieldState("annual_household_income_state").notNull().default("unknown"),
  fundingSource: text("funding_source"),
  fundingSourceState: financeFieldState("funding_source_state").notNull().default("unknown"),
  financialAidNeeded: boolean("financial_aid_needed"),
  financialAidState: financeFieldState("financial_aid_state").notNull().default("unknown"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  budgetNonNegative: check("family_education_finances_budget_non_negative", sql`${table.annualBudgetMinor} is null or ${table.annualBudgetMinor} >= 0`),
  educationSavingsNonNegative: check("family_education_finances_savings_non_negative", sql`${table.educationSavingsInr} is null or ${table.educationSavingsInr} >= 0`),
  proposedLoanNonNegative: check("family_education_finances_loan_non_negative", sql`${table.proposedLoanInr} is null or ${table.proposedLoanInr} >= 0`),
  annualIncomeNonNegative: check("family_education_finances_income_non_negative", sql`${table.annualHouseholdIncomeInr} is null or ${table.annualHouseholdIncomeInr} >= 0`),
}));

export const studentConsultations = pgTable("student_consultations", {
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  consultationId: uuid("consultation_id").notNull().references(() => consultations.id, { onDelete: "cascade" }),
  associatedByUserId: uuid("associated_by_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  associatedAt: timestamp("associated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  studentConsultationPrimaryKey: uniqueIndex("student_consultations_student_consultation_idx").on(table.studentId, table.consultationId),
  consultationUnique: uniqueIndex("student_consultations_consultation_unique_idx").on(table.consultationId),
}));

export const familyAuditEvents = pgTable("family_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
  consultationId: uuid("consultation_id").references(() => consultations.id, { onDelete: "set null" }),
  eventType: familyAuditEventType("event_type").notNull(),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consultationProfileProposals = pgTable("consultation_profile_proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  consultationId: uuid("consultation_id").notNull().references(() => consultations.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  extractionId: uuid("extraction_id").references(() => consultationExtractions.id, { onDelete: "set null" }),
  fieldName: text("field_name").notNull(),
  studentFieldName: text("student_field_name"),
  familyFinanceFieldName: text("family_finance_field_name"),
  proposedValue: jsonb("proposed_value"),
  existingValue: jsonb("existing_value"),
  state: proposalState("state").notNull().default("pending"),
  resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  consultationStudentFieldUnique: uniqueIndex("consultation_profile_proposals_consultation_student_field_idx").on(table.consultationId, table.studentId, table.fieldName),
}));

export const advisorCases = pgTable("advisor_cases", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseTokenHash: text("case_token_hash").notNull(),
  mode: advisorCaseMode("mode").notNull(),
  status: advisorCaseStatus("status").notNull().default("provisional"),
  authorization: advisorCaseAuthorization("authorization").notNull().default("none"),
  compactBrief: jsonb("compact_brief"),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  familyId: uuid("family_id").references(() => families.id, { onDelete: "set null" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenUnique: uniqueIndex("advisor_cases_token_hash_idx").on(table.caseTokenHash),
}));

export const advisorCaseEvents = pgTable("advisor_case_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull().references(() => advisorCases.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  actor: advisorCaseEventActor("actor").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  caseSequenceUnique: uniqueIndex("advisor_case_events_case_sequence_idx").on(table.caseId, table.sequence),
}));

export const advisorCaseMemory = pgTable("advisor_case_memory", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").references(() => advisorCases.id, { onDelete: "set null" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
  sourceConsultationId: uuid("source_consultation_id").references(() => consultations.id, { onDelete: "set null" }),
  memoryKey: text("memory_key").notNull(),
  category: advisorMemoryCategory("category").notNull(),
  status: advisorMemoryStatus("status").notNull().default("active"),
  source: advisorMemorySource("source").notNull(),
  statement: text("statement").notNull(),
  value: jsonb("value"),
  fingerprint: text("fingerprint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  fingerprintUnique: uniqueIndex("advisor_case_memory_fingerprint_idx").on(table.fingerprint),
  targetRequired: check("advisor_case_memory_target_required", sql`${table.caseId} is not null or ${table.studentId} is not null`),
}));

export const advisorCaseRecommendations = pgTable("advisor_case_recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id").notNull().references(() => advisorCases.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
  sourceConsultationId: uuid("source_consultation_id").references(() => consultations.id, { onDelete: "set null" }),
  revisionId: uuid("revision_id").notNull().references(() => catalogProgramRevisions.id, { onDelete: "restrict" }),
  status: advisorRecommendationStatus("status").notNull().default("saved"),
  rationale: text("rationale").notNull(),
  assessment: jsonb("assessment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  caseRevisionUnique: uniqueIndex("advisor_case_recommendations_case_revision_idx").on(table.caseId, table.revisionId),
}));

export const familiesRelations = relations(families, ({ one, many }) => ({
  owner: one(users, { fields: [families.ownerUserId], references: [users.id] }),
  students: many(students),
  finances: one(familyEducationFinances),
  auditEvents: many(familyAuditEvents),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  family: one(families, { fields: [students.familyId], references: [families.id] }),
  consultations: many(studentConsultations),
  auditEvents: many(familyAuditEvents),
}));

export const familyEducationFinancesRelations = relations(familyEducationFinances, ({ one }) => ({
  family: one(families, { fields: [familyEducationFinances.familyId], references: [families.id] }),
}));

export const studentConsultationsRelations = relations(studentConsultations, ({ one }) => ({
  student: one(students, { fields: [studentConsultations.studentId], references: [students.id] }),
  consultation: one(consultations, { fields: [studentConsultations.consultationId], references: [consultations.id] }),
  associatedBy: one(users, { fields: [studentConsultations.associatedByUserId], references: [users.id] }),
}));

export const familyAuditEventsRelations = relations(familyAuditEvents, ({ one }) => ({
  family: one(families, { fields: [familyAuditEvents.familyId], references: [families.id] }),
  actor: one(users, { fields: [familyAuditEvents.actorUserId], references: [users.id] }),
  student: one(students, { fields: [familyAuditEvents.studentId], references: [students.id] }),
  consultation: one(consultations, { fields: [familyAuditEvents.consultationId], references: [consultations.id] }),
}));

export const consultationProfileProposalsRelations = relations(consultationProfileProposals, ({ one }) => ({
  consultation: one(consultations, { fields: [consultationProfileProposals.consultationId], references: [consultations.id] }),
  student: one(students, { fields: [consultationProfileProposals.studentId], references: [students.id] }),
  extraction: one(consultationExtractions, { fields: [consultationProfileProposals.extractionId], references: [consultationExtractions.id] }),
  resolvedBy: one(users, { fields: [consultationProfileProposals.resolvedByUserId], references: [users.id] }),
}));

export const schemaDefaults = sql`now()`;

export type Consultation = typeof consultations.$inferSelect;
export type ConsultationExtraction = typeof consultationExtractions.$inferSelect;
export type Family = typeof families.$inferSelect;
export type Student = typeof students.$inferSelect;
export type FamilyEducationFinance = typeof familyEducationFinances.$inferSelect;
export type StudentConsultation = typeof studentConsultations.$inferSelect;
export type FamilyAuditEvent = typeof familyAuditEvents.$inferSelect;
export type ConsultationProfileProposal = typeof consultationProfileProposals.$inferSelect;
export type AdvisorCase = typeof advisorCases.$inferSelect;
export type AdvisorCaseMemory = typeof advisorCaseMemory.$inferSelect;
export type AdvisorCaseRecommendation = typeof advisorCaseRecommendations.$inferSelect;

// Catalog tables remain authored in the isolated module, but this canonical
// re-export makes them part of the shared Drizzle schema after integration.
export * from "../modules/catalog/schema";
