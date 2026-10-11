CREATE TYPE "public"."proposal_state" AS ENUM('pending', 'conflict', 'accepted', 'rejected', 'unmapped');--> statement-breakpoint
ALTER TYPE "public"."family_audit_event_type" ADD VALUE 'consultation_profile_proposed';--> statement-breakpoint
ALTER TYPE "public"."family_audit_event_type" ADD VALUE 'consultation_profile_accepted';--> statement-breakpoint
ALTER TYPE "public"."family_audit_event_type" ADD VALUE 'consultation_profile_rejected';--> statement-breakpoint
CREATE TABLE "consultation_profile_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "consultation_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "extraction_id" uuid,
  "field_name" text NOT NULL,
  "student_field_name" text,
  "proposed_value" jsonb,
  "existing_value" jsonb,
  "state" "proposal_state" DEFAULT 'pending' NOT NULL,
  "resolved_by_user_id" uuid,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_profile_proposals_consultation_student_field_idx" ON "consultation_profile_proposals" USING btree ("consultation_id", "student_id", "field_name");--> statement-breakpoint
ALTER TABLE "consultation_profile_proposals" ADD CONSTRAINT "consultation_profile_proposals_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_profile_proposals" ADD CONSTRAINT "consultation_profile_proposals_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_profile_proposals" ADD CONSTRAINT "consultation_profile_proposals_extraction_id_consultation_extractions_id_fk" FOREIGN KEY ("extraction_id") REFERENCES "public"."consultation_extractions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_profile_proposals" ADD CONSTRAINT "consultation_profile_proposals_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
