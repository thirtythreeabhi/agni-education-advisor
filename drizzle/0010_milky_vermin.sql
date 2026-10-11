CREATE TYPE "public"."advisor_memory_category" AS ENUM('confirmed_profile', 'caller_reported', 'preference', 'decision', 'proposed_change', 'unresolved_question', 'promised_action', 'follow_up_outcome', 'discussed_university');--> statement-breakpoint
CREATE TYPE "public"."advisor_memory_source" AS ENUM('caller', 'function', 'webhook_extraction', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."advisor_memory_status" AS ENUM('active', 'resolved', 'superseded', 'rejected', 'uncertain', 'conflicted');--> statement-breakpoint
CREATE TABLE "advisor_case_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"student_id" uuid,
	"source_consultation_id" uuid,
	"memory_key" text NOT NULL,
	"category" "advisor_memory_category" NOT NULL,
	"status" "advisor_memory_status" DEFAULT 'active' NOT NULL,
	"source" "advisor_memory_source" NOT NULL,
	"statement" text NOT NULL,
	"value" jsonb,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advisor_case_memory_target_required" CHECK ("advisor_case_memory"."case_id" is not null or "advisor_case_memory"."student_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "advisor_cases" ADD COLUMN "compact_brief" jsonb;--> statement-breakpoint
ALTER TABLE "advisor_case_memory" ADD CONSTRAINT "advisor_case_memory_case_id_advisor_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."advisor_cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_case_memory" ADD CONSTRAINT "advisor_case_memory_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_case_memory" ADD CONSTRAINT "advisor_case_memory_source_consultation_id_consultations_id_fk" FOREIGN KEY ("source_consultation_id") REFERENCES "public"."consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_case_memory_fingerprint_idx" ON "advisor_case_memory" USING btree ("fingerprint");