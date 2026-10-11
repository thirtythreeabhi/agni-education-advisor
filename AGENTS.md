# Agni Education Advisor — engineering guidance

## Architecture

- This is a Next.js App Router application using TypeScript, React, Auth.js v5, Drizzle ORM, and PostgreSQL (Neon in staging/production; local PostgreSQL for development).
- Server routes and server components own database access. Keep secrets, password verification, webhook handling, and privileged mutations server-only; never expose them through client components or `NEXT_PUBLIC_*` variables.
- Consultations are the current vertical slice: an authenticated admin can review Agni call data. Family profiles and the university catalog are separate feature areas and should be added through explicit modules, migrations, authorization checks, and tests.
- Keep `src/db/schema.ts` as the source of truth for Drizzle schema changes. Commit generated SQL migrations under `drizzle/`; do not edit an already-applied migration.

## Security and authentication

- Auth.js uses encrypted JWT sessions with credentials authentication. User identifiers are normalized before lookup; passwords are verified with Argon2; login attempts are rate-limited in the database.
- Roles are `admin` and `user`. Public registration must never grant admin access. Use `requireAdmin()` or an equivalent server-side authorization check for privileged pages and mutations, and re-check account activity/session version for sensitive operations.
- Keep `AUTH_SECRET`, database URLs, Agni secrets, bootstrap credentials, and password material out of source control and logs. Use constant-time comparison for shared secrets and validate all external input with Zod.
- Preserve the recording/token scrubbing behavior before Agni data is persisted. Do not log webhook bodies, transcripts, recording URLs, access tokens, or database error details.
- Family/student records can contain sensitive minor data and financial context. Enforce exact owner checks for ordinary users; consultation association and profile-proposal resolution are explicit admin actions. Do not add logs, exports, or client-side exposure for these records without an approved privacy/retention decision.

## Database conventions

- Use Drizzle queries and transactions; preserve unique constraints and foreign keys. Design idempotent webhook and retry paths, and use database-enforced uniqueness for deduplication.
- Keep migrations backward-compatible where practical. Review generated SQL before applying it. Run migrations only against the explicitly selected local or test database; never point local commands at production.
- `DATABASE_URL` is the runtime connection. `TEST_DATABASE_URL` is optional and must refer to an isolated disposable database. Keep the connection pool conservative for serverless execution.
- Store timestamps with timezone. Normalize identifiers and other canonical values at the boundary, while retaining original external values only when their retention is approved and safe.

## Agni integration

- The webhook endpoint is `POST /api/webhooks/agni`. It accepts the `call_completed` event, authenticates using the configured header and `AGNI_WEBHOOK_SECRET`, validates the payload, enforces a 1 MB limit, scrubs recording/token material, and persists transactionally.
- Preserve duplicate-safe processing keyed by `call_session.id`. Return 401 for authentication failures, 400 for malformed/invalid payloads, 413 for oversized payloads, 200 for successful or already-processed deliveries, and 500 for retryable processing failures.
- Treat the Agni payload as untrusted and expect schema evolution. Update `src/lib/agni-schema.ts`, unit tests, and migration/data-retention review together when the contract changes.
- Association is separate from ingestion: webhook retries must preserve existing associations and proposals. Extracted profile values are proposals; never overwrite a student silently, and require explicit acceptance/rejection for conflicts. Financial extractions remain review data unless a separately approved mapping is added.

## Verified university data requirements

- Never invent universities, programs, rankings, fees, admission requirements, deadlines, accreditation, outcomes, or location facts.
- Catalog records must retain source URL, publisher/authority, retrieval date, applicable academic year, and a verification status. Prefer official university, government, accreditor, or exam-body sources; record conflicts instead of silently choosing.
- Separate sourced facts from advisor recommendations. Show freshness/uncertainty to users, and add tests for provenance, missing data, stale data, and duplicate institutions before exposing catalog-driven recommendations.

## Testing and workflow

- Before handoff, run `npm test`, `npm run typecheck`, and `npm run lint`; run `npm run build` when framework/configuration changes or when practical. Integration tests run only when `TEST_DATABASE_URL` is explicitly set.
- Keep unit tests beside the relevant module. For database changes, test constraints, rollback behavior, authorization, and retry/idempotency paths.
- Use two parallel worktrees for independent work: `feature/family-profiles` and `feature/university-catalog`. Keep commits focused, do not deploy or push from setup work, and do not modify Neon or Vercel configuration without explicit authorization.
