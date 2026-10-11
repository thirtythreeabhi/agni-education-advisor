import type { CatalogImportRecord } from "./import-schema";

const STALE_AFTER_DAYS = 365;
type ReadinessInput = Pick<CatalogImportRecord, "academicYear" | "intakes" | "requirements"> & {
  fees: Array<{ feeType: "international_tuition" | "mandatory"; amount: number; currency: string; isRequired?: boolean }>;
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
  if (!input.intakes.some((intake) => Boolean(intake.startsOn && intake.applicationDeadline && intake.applicationDeadline >= asOf.toISOString().slice(0, 10) && intake.startsOn >= asOf.toISOString().slice(0, 10)))) issues.push({ code: "missing_current_intake_deadline", message: "At least one future intake with a future application deadline is required." });
  if (input.requirements.length === 0) issues.push({ code: "missing_requirements", message: "At least one admission requirement is required." });
  const criticalFees = input.fees.filter((fee) => (fee.feeType === "international_tuition" || fee.feeType === "mandatory") && fee.isRequired !== false);
  if (!criticalFees.some((fee) => fee.feeType === "international_tuition") || !criticalFees.some((fee) => fee.feeType === "mandatory")) issues.push({ code: "incomplete_fees", message: "Required international tuition and mandatory fee facts are both required." });
  if (criticalFees.some((fee) => !Number.isFinite(fee.amount) || fee.amount <= 0)) issues.push({ code: "invalid_fee_amount", message: "Required fee amounts must be positive before affordability use." });
  const feeCurrencies = new Set(criticalFees.map((fee) => fee.currency));
  if (feeCurrencies.size > 1) issues.push({ code: "fee_currency_mismatch", message: "Required tuition and mandatory fees use different currencies and cannot be compared without conversion." });
  return { ready: issues.length === 0, issues };
}
