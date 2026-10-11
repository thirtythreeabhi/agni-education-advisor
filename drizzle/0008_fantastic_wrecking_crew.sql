CREATE TYPE "public"."advisor_case_authorization" AS ENUM('none', 'pending', 'verified', 'denied');--> statement-breakpoint
CREATE TYPE "public"."advisor_case_event_actor" AS ENUM('caller', 'function', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."advisor_case_mode" AS ENUM('demo', 'guest', 'private');--> statement-breakpoint
CREATE TYPE "public"."advisor_case_status" AS ENUM('provisional', 'ambiguous', 'resolved', 'expired', 'closed');--> statement-breakpoint
CREATE TABLE "advisor_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"actor" "advisor_case_event_actor" NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advisor_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_token_hash" text NOT NULL,
	"mode" "advisor_case_mode" NOT NULL,
	"status" "advisor_case_status" DEFAULT 'provisional' NOT NULL,
	"authorization" "advisor_case_authorization" DEFAULT 'none' NOT NULL,
	"owner_user_id" uuid,
	"family_id" uuid,
	"student_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "graduation_year" integer;--> statement-breakpoint
ALTER TABLE "advisor_case_events" ADD CONSTRAINT "advisor_case_events_case_id_advisor_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."advisor_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_cases" ADD CONSTRAINT "advisor_cases_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_cases" ADD CONSTRAINT "advisor_cases_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_cases" ADD CONSTRAINT "advisor_cases_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_case_events_case_sequence_idx" ON "advisor_case_events" USING btree ("case_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_cases_token_hash_idx" ON "advisor_cases" USING btree ("case_token_hash");