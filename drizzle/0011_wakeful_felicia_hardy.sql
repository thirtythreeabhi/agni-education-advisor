CREATE TYPE "public"."advisor_recommendation_status" AS ENUM('saved', 'dismissed');--> statement-breakpoint
CREATE TABLE "advisor_case_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"student_id" uuid,
	"source_consultation_id" uuid,
	"revision_id" uuid NOT NULL,
	"status" "advisor_recommendation_status" DEFAULT 'saved' NOT NULL,
	"rationale" text NOT NULL,
	"assessment" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor_case_recommendations" ADD CONSTRAINT "advisor_case_recommendations_case_id_advisor_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."advisor_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_case_recommendations" ADD CONSTRAINT "advisor_case_recommendations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_case_recommendations" ADD CONSTRAINT "advisor_case_recommendations_source_consultation_id_consultations_id_fk" FOREIGN KEY ("source_consultation_id") REFERENCES "public"."consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_case_recommendations" ADD CONSTRAINT "advisor_case_recommendations_revision_id_catalog_program_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_program_revisions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "advisor_case_recommendations_case_revision_idx" ON "advisor_case_recommendations" USING btree ("case_id","revision_id");