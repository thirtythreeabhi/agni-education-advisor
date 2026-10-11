ALTER TABLE "family_audit_events" DROP CONSTRAINT "family_audit_events_family_id_families_id_fk";--> statement-breakpoint
ALTER TABLE "family_audit_events" ADD CONSTRAINT "family_audit_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;
