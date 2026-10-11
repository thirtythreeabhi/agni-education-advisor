ALTER TABLE "consultation_profile_proposals" ADD COLUMN "family_finance_field_name" text;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD COLUMN "education_savings_inr" integer;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD COLUMN "education_savings_state" "finance_field_state" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD COLUMN "proposed_loan_inr" integer;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD COLUMN "proposed_loan_state" "finance_field_state" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD COLUMN "annual_household_income_inr" integer;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD COLUMN "annual_household_income_state" "finance_field_state" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "specialization" text;--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD CONSTRAINT "family_education_finances_savings_non_negative" CHECK ("family_education_finances"."education_savings_inr" is null or "family_education_finances"."education_savings_inr" >= 0);--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD CONSTRAINT "family_education_finances_loan_non_negative" CHECK ("family_education_finances"."proposed_loan_inr" is null or "family_education_finances"."proposed_loan_inr" >= 0);--> statement-breakpoint
ALTER TABLE "family_education_finances" ADD CONSTRAINT "family_education_finances_income_non_negative" CHECK ("family_education_finances"."annual_household_income_inr" is null or "family_education_finances"."annual_household_income_inr" >= 0);