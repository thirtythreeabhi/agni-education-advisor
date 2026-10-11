import { relations, sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
  careerGoals: text("career_goals"),
  preferredCountries: text("preferred_countries").array().notNull().default(sql`'{}'::text[]`),
  preferredIntake: text("preferred_intake"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const familyEducationFinances = pgTable("family_education_finances", {
  familyId: uuid("family_id").primaryKey().references(() => families.id, { onDelete: "cascade" }),
  annualBudgetMinor: integer("annual_budget_minor"),
  annualBudgetCurrency: text("annual_budget_currency"),
  annualBudgetState: financeFieldState("annual_budget_state").notNull().default("unknown"),
  fundingSource: text("funding_source"),
  fundingSourceState: financeFieldState("funding_source_state").notNull().default("unknown"),
  financialAidNeeded: boolean("financial_aid_needed"),
  financialAidState: financeFieldState("financial_aid_state").notNull().default("unknown"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  budgetNonNegative: check("family_education_finances_budget_non_negative", sql`${table.annualBudgetMinor} is null or ${table.annualBudgetMinor} >= 0`),
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

// Catalog tables remain authored in the isolated module, but this canonical
// re-export makes them part of the shared Drizzle schema after integration.
export * from "../modules/catalog/schema";
