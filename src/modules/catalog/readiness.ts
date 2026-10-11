import type { CatalogImportRecord } from "./import-schema";

const STALE_AFTER_DAYS = 365;
type ReadinessInput = Pick<CatalogImportRecord, "academicYear" | "intakes" | "requirements" | "fees"> & {
  verificationStatus: string;
  verifiedAt: Date | null;
  retrievedAt: Date;
  effectiveTo: string | null;
  sourceUrl: string;
};

export type ReadinessIssue = { code: string; message: string };

export function checkCatalogReadiness(input: ReadinessInput, asOf = new Date()) {
  const issues: ReadinessIssue[] = [];
  if (input.verificationStatus !== "verified") issues.push({ code: "unverified", message: "Revision has not been explicitly verified by an admin." });
  if (!input.verifiedAt) issues.push({ code: "missing_verification_timestamp", message: "Verification timestamp is missing." });
  if (!input.sourceUrl) issues.push({ code: "missing_source", message: "Official source URL is missing." });
  if (asOf.getTime() - input.retrievedAt.getTime() > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000) issues.push({ code: "stale_source", message: "Evidence is older than the freshness window." });
  if (input.effectiveTo && input.effectiveTo < asOf.toISOString().slice(0, 10)) issues.push({ code: "expired_effective_period", message: "The effective period has ended." });
  if (!input.intakes.some((intake) => Boolean(intake.startsOn && intake.applicationDeadline))) issues.push({ code: "missing_intake_deadline", message: "At least one intake with a deadline is required." });
  if (input.requirements.length === 0) issues.push({ code: "missing_requirements", message: "At least one admission requirement is required." });
  if (!input.fees.some((fee) => fee.feeType === "international_tuition") || !input.fees.some((fee) => fee.feeType === "mandatory")) issues.push({ code: "incomplete_fees", message: "International tuition and mandatory fee facts are both required." });
  return { ready: issues.length === 0, issues };
}
