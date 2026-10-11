CREATE TYPE "public"."catalog_authority_type" AS ENUM('university', 'government', 'accreditor', 'exam_body', 'other_official');--> statement-breakpoint
CREATE TYPE "public"."catalog_degree_level" AS ENUM('bachelor', 'master');--> statement-breakpoint
CREATE TYPE "public"."catalog_fee_type" AS ENUM('international_tuition', 'mandatory');--> statement-breakpoint
CREATE TYPE "public"."catalog_requirement_type" AS ENUM('academic', 'language', 'entrance_exam', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."catalog_verification_status" AS ENUM('unverified', 'in_review', 'verified', 'conflicting', 'stale');--> statement-breakpoint
CREATE TABLE "catalog_academic_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"requirement_type" "catalog_requirement_type" NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_evidence_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"publisher" text NOT NULL,
	"authority_type" "catalog_authority_type" NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_institution_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"verification_status" "catalog_verification_status" DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" text NOT NULL,
	"official_name" text NOT NULL,
	"country_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_institutions_country_code_check" CHECK ("catalog_institutions"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "catalog_program_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"fee_type" "catalog_fee_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"description" text,
	"fee_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_program_fees_amount_non_negative_check" CHECK ("catalog_program_fees"."amount" >= 0),
	CONSTRAINT "catalog_program_fees_currency_check" CHECK ("catalog_program_fees"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "catalog_program_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"intake_name" text NOT NULL,
	"starts_on" date,
	"application_deadline" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_program_intakes_deadline_before_start_check" CHECK ("catalog_program_intakes"."starts_on" is null or "catalog_program_intakes"."application_deadline" is null or "catalog_program_intakes"."application_deadline" <= "catalog_program_intakes"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "catalog_program_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"program_title" text NOT NULL,
	"verification_status" "catalog_verification_status" DEFAULT 'unverified' NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"effective_from" date,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_program_revisions_academic_year_check" CHECK ("catalog_program_revisions"."academic_year" ~ '^[0-9]{4}-[0-9]{4}$'),
	CONSTRAINT "catalog_program_revisions_effective_range_check" CHECK ("catalog_program_revisions"."effective_to" is null or "catalog_program_revisions"."effective_from" is null or "catalog_program_revisions"."effective_to" >= "catalog_program_revisions"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "catalog_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"degree_level" "catalog_degree_level" NOT NULL,
	"discipline" text NOT NULL,
	"specialization" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_academic_requirements" ADD CONSTRAINT "catalog_academic_requirements_revision_id_catalog_program_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_program_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_institution_sources" ADD CONSTRAINT "catalog_institution_sources_institution_id_catalog_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."catalog_institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_institution_sources" ADD CONSTRAINT "catalog_institution_sources_source_id_catalog_evidence_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."catalog_evidence_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_program_fees" ADD CONSTRAINT "catalog_program_fees_revision_id_catalog_program_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_program_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_program_intakes" ADD CONSTRAINT "catalog_program_intakes_revision_id_catalog_program_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_program_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_program_revisions" ADD CONSTRAINT "catalog_program_revisions_program_id_catalog_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."catalog_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_program_revisions" ADD CONSTRAINT "catalog_program_revisions_source_id_catalog_evidence_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."catalog_evidence_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_programs" ADD CONSTRAINT "catalog_programs_institution_id_catalog_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."catalog_institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_academic_requirements_revision_type_description_idx" ON "catalog_academic_requirements" USING btree ("revision_id","requirement_type","description");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_evidence_sources_url_retrieved_idx" ON "catalog_evidence_sources" USING btree ("url","retrieved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_institution_sources_pair_idx" ON "catalog_institution_sources" USING btree ("institution_id","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_institutions_stable_key_idx" ON "catalog_institutions" USING btree ("stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_program_fees_revision_fee_key_idx" ON "catalog_program_fees" USING btree ("revision_id","fee_key");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_program_intakes_revision_name_idx" ON "catalog_program_intakes" USING btree ("revision_id","intake_name");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_program_revisions_program_year_source_idx" ON "catalog_program_revisions" USING btree ("program_id","academic_year","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_programs_institution_stable_key_idx" ON "catalog_programs" USING btree ("institution_id","stable_key");