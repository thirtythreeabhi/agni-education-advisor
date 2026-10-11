# University catalog integration notes

The catalog remains isolated under `src/modules/catalog`, while its Drizzle tables are re-exported through `src/db/schema.ts` for the application and advisor functions. The catalog and recommendation migrations must still be generated and applied only to an explicitly selected local/test database.

## Data integrity

- Institutions deduplicate by `stableKey`; programs deduplicate by institution plus program `stableKey`.
- Evidence sources deduplicate by URL plus retrieval timestamp. A metadata mismatch for an existing identity is reported as a per-record import error.
- Program revisions are immutable snapshots keyed by program, academic year, and source. Import never changes an existing title, effective period, classification, requirement, intake, or fee.
- Admission requirements and fees are source-backed through their revision. Intakes are revision-specific, so deadlines cannot leak between academic years.
- Fees use a revision-scoped `feeKey` so repeatable imports also deduplicate fees with no description.

## Review and readiness

Imports always create `unverified` revisions. Review must move a revision through `in_review` before `verified`; conflicting and stale facts return to review. `checkCatalogReadiness()` rejects anything unverified, missing a verification timestamp or source, stale/expired, missing a deadline-bearing intake, missing requirements, or missing either international tuition or mandatory fees. UI labels incomplete facts as unconfirmed.

## Merge steps

For a new environment:

1. Generate a migration from the merged schema. Do not edit an already-applied migration.
2. Review the generated SQL, including the requirement, fee-key, and case-recommendation unique indexes and foreign-key delete behavior.
3. Apply it only to the selected local or isolated test database, then run the catalog and advisory database integration tests with `TEST_DATABASE_URL` set.
4. Keep Neon/Vercel configuration and deployment outside this branch.

The current unit tests run without a database. Database integration coverage is intentionally blocked until the merge migration exists and an isolated `TEST_DATABASE_URL` is provided.
