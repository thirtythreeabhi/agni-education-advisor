export type CatalogVerificationStatus = "unverified" | "in_review" | "verified" | "conflicting" | "stale";

const allowedTransitions: Record<CatalogVerificationStatus, readonly CatalogVerificationStatus[]> = {
  unverified: ["unverified", "in_review"],
  in_review: ["in_review", "verified", "conflicting", "unverified"],
  verified: ["verified", "stale", "conflicting", "in_review"],
  conflicting: ["conflicting", "in_review"],
  stale: ["stale", "in_review"],
};

export function canTransitionVerification(from: CatalogVerificationStatus, to: CatalogVerificationStatus) {
  return allowedTransitions[from].includes(to);
}
