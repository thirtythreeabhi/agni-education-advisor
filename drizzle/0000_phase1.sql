CREATE TYPE "public"."processing_status" AS ENUM('received', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."association_status" AS ENUM('unassociated', 'associated');--> statement-breakpoint
CREATE TYPE "public"."extraction_state" AS ENUM('confirmed', 'missing', 'review');--> statement-breakpoint
CREATE TABLE "consultations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agni_session_id" text NOT NULL UNIQUE,
  "agent_id" text,
  "agni_status" text,
  "duration_sec" integer,
  "disconnect_reason" text,
  "post_call_analysis" jsonb,
  "transcriptions" jsonb,
  "processing_status" "processing_status" DEFAULT 'received' NOT NULL,
  "processing_error" text,
  "association_status" "association_status" DEFAULT 'unassociated' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "consultation_extractions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "consultation_id" uuid NOT NULL,
  "field_name" text NOT NULL,
  "field_type" text NOT NULL,
  "original_value" jsonb,
  "normalized_value" jsonb,
  "state" "extraction_state" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "consultation_extractions" ADD CONSTRAINT "consultation_extractions_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consultation_extractions_consultation_field_idx" ON "consultation_extractions" USING btree ("consultation_id", "field_name");
