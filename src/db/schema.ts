import { relations, sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const processingStatus = pgEnum("processing_status", ["received", "processing", "processed", "failed"]);
export const associationStatus = pgEnum("association_status", ["unassociated", "associated"]);
export const extractionState = pgEnum("extraction_state", ["confirmed", "missing", "review"]);
export const userRole = pgEnum("user_role", ["admin", "user"]);

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

export const schemaDefaults = sql`now()`;

export type Consultation = typeof consultations.$inferSelect;
export type ConsultationExtraction = typeof consultationExtractions.$inferSelect;
