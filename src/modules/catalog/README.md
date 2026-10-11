# University catalog integration notes

The catalog is deliberately isolated under `src/modules/catalog`. Its Drizzle tables are not exported from `src/db/schema.ts` yet, and this branch does not modify `drizzle.config.ts` or migrations. The admin pages and import APIs therefore become runnable against the catalog tables only after the integration migration is generated and applied to an explicitly selected local/test database.

## Data integrity

- Institutions deduplicate by `stableKey`; programs deduplicate by institution plus program `stableKey`.
- Evidence sources deduplicate by URL plus retrieval timestamp. A metadata mismatch for an existing identity is reported as a per-record import error.
- Program revisions are immutable snapshots keyed by program, academic year, and source. Import never changes an existing title, effective period, classification, requirement, intake, or fee.
- Admission requirements and fees are source-backed through their revision. Intakes are revision-specific, so deadlines cannot leak between academic years.
- Fees use a revision-scoped `feeKey` so repeatable imports also deduplicate fees with no description.

## Review and readiness

Imports always create `unverified` revisions. Review must move a revision through `in_review` before `verified`; conflicting and stale facts return to review. `checkCatalogReadiness()` rejects anything unverified, missing a verification timestamp or source, stale/expired, missing a deadline-bearing intake, missing requirements, or missing either international tuition or mandatory fees. UI labels incomplete facts as unconfirmed.

## Merge steps

After the family and catalog branches are merged:

1. Export the catalog tables/enums from `src/modules/catalog/schema.ts` through the shared Drizzle schema composition chosen by the integration branch.
2. Generate a new migration from the merged schema. Do not edit an already-applied migration.
3. Review the generated SQL, including the requirement and fee-key unique indexes and foreign-key delete behavior.
4. Apply it only to the selected local or isolated test database, then run the catalog database integration tests with `TEST_DATABASE_URL` set.
5. Keep Neon/Vercel configuration and deployment outside this branch.

The current unit tests run without a database. Database integration coverage is intentionally blocked until the merge migration exists and an isolated `TEST_DATABASE_URL` is provided.
