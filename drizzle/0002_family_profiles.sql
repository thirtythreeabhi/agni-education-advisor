CREATE TYPE "public"."finance_field_state" AS ENUM('confirmed', 'unknown', 'review');--> statement-breakpoint
CREATE TYPE "public"."family_audit_event_type" AS ENUM('family_created', 'family_updated', 'student_created', 'student_updated', 'education_finances_updated', 'consultation_associated', 'consultation_disassociated');--> statement-breakpoint
CREATE TABLE "families" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "students" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "family_id" uuid NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text,
  "current_grade" text,
  "school_name" text,
  "academic_summary" text,
  "desired_degree" text,
  "career_goals" text,
  "preferred_countries" text[] DEFAULT '{}'::text[] NOT NULL,
  "preferred_intake" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "family_education_finances" (
  "family_id" uuid PRIMARY KEY NOT NULL,
  "annual_budget_minor" integer,
  "annual_budget_currency" text,
  "annual_budget_state" "finance_field_state" DEFAULT 'unknown' NOT NULL,
  "funding_source" text,
  "funding_source_state" "finance_field_state" DEFAULT 'unknown' NOT NULL,
  "financial_aid_needed" boolean,
  "financial_aid_state" "finance_field_state" DEFAULT 'unknown' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "family_education_finances_budget_non_negative" CHECK ("annual_budget_minor" is null or "annual_budget_minor" >= 0)
);--> statement-breakpoint
CREATE TABLE "student_consultations" (
  "student_id" uuid NOT NULL,
  "consultation_id" uuid NOT NULL,
  "associated_by_user_id" uuid NOT NULL,
  "associated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "student_consultations_student_consultation_idx" ON "student_consultations" USING btree ("student_id", "consultation_id");--> statement-breakpoint
CREATE TABLE "family_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "family_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "student_id" uuid,
  "consultation_id" uuid,
  "event_type" "family_audit_event_type" NOT NULL,
  "changes" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD CONSTRAINT "family_education_finances_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_consultations" ADD CONSTRAINT "student_consultations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_consultations" ADD CONSTRAINT "student_consultations_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_consultations" ADD CONSTRAINT "student_consultations_associated_by_user_id_users_id_fk" FOREIGN KEY ("associated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_audit_events" ADD CONSTRAINT "family_audit_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_audit_events" ADD CONSTRAINT "family_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_audit_events" ADD CONSTRAINT "family_audit_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_audit_events" ADD CONSTRAINT "family_audit_events_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE set null ON UPDATE no action;
