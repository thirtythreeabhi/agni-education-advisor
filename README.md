# Agni Education Advisor

The application authenticates, validates, deduplicates, normalizes, and persists Agni `call_completed` webhooks; provides protected consultation and owner-scoped family/student workflows; and provides an admin-only, source-backed university catalog and import/review workflow.

The catalog never invents institutions or programs. Imported data remains unverified and is not recommendation-ready until it passes the explicit readiness check.

## Local setup

Requirements: Node.js 20+ and the existing local PostgreSQL installation for development. Neon remains the staging/production database.

On this development machine, the native Next.js SWC binary crashes with a bus error. The `dev` and `build` scripts therefore use Next's WASM compiler fallback; this is slower but avoids the native binary crash. The matching `@next/swc-wasm-nodejs` package is installed as a development dependency.

```bash
npm install
cp .env.example .env.local
# Fill in the values in .env.local; use the local DATABASE_URL for development
npm run db:migrate
npm run dev
```

The catalog importer is available at `/admin/catalog/import`. Its JSON v1 contract and integration notes are documented in [`src/modules/catalog/import-format.md`](src/modules/catalog/import-format.md) and [`src/modules/catalog/README.md`](src/modules/catalog/README.md).

The migration entrypoint intentionally uses an `async function main()` instead of top-level `await`, so it remains compatible with the repository's CommonJS-oriented `tsx` execution path. The local PostgreSQL 18 cluster is expected on port 5432. Create the local role and database once, using an administrative shell:

```bash
sudo -u postgres psql -c "CREATE ROLE agni_app LOGIN PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE agni_education_advisor OWNER agni_app;"
```

If the role or database already exists, keep the existing installation and credentials instead of rerunning those commands. Do not run the local setup commands against Neon.

Provision an administrator from a server-only shell after the migration:

```bash
npm run auth:bootstrap-admin
```

Run checks with:

```bash
npm test
npm run typecheck
npm run lint
```

Integration tests run only when `TEST_DATABASE_URL` is explicitly set. Use a disposable Neon branch or local PostgreSQL database, apply the migration there, and never point it at a production database.

`DATABASE_URL`, `AUTH_SECRET`, and password material are server-only. Auth.js uses encrypted JWT session cookies; cookies are HttpOnly, SameSite-safe, and secure in production. `AGNI_WEBHOOK_SECRET` remains independent of user authentication and is checked server-side using a constant-time comparison.

The migration command loads `.env` and then `.env.local` (with `.env.local` taking precedence). In staging/production, set `DATABASE_URL` to the Neon connection string through the deployment environment. The database pool is cached per warm server process and limited to one connection per process; serverless platforms can still create multiple processes, so Neon pooling and conservative connection limits remain important.

## Agni webhook contract

Send a `POST` request to `/api/webhooks/agni` with the configured header name and exact shared-secret value. The accepted event is `call_completed`; the required unique identifier is `call_session.id`.

The handler returns `401` for invalid authentication, `400` for invalid JSON/schema, `200` for successful or duplicate-safe processing, and `500` for processing failures so a provider retry can occur.

Every ingested consultation starts as `unassociated` and is only visible to configured administrators. An administrator can search existing students and explicitly associate a consultation. The association is audited, one consultation can belong to only one student, and extracted profile fields become proposals rather than silent updates. Existing student values remain unchanged until an administrator explicitly accepts a proposal; conflicts can be rejected or explicitly resolved.

Recording URLs and tokenized recording references are removed before persistence. Transcript retention is intentionally unresolved; transcripts are retained only for this phase and are admin-protected until a retention decision is approved.

## Environment variables

See `.env.example`. The Agni header name defaults to `x-agni-webhook-secret` when omitted. Configure the exact header name and secret in Agni and the server environment; this implementation does not assume or implement HMAC signing.

## Database schema

The minimal schema contains:

- `consultations`: one row per unique Agni call session, including processing and association state.
- `consultation_extractions`: normalized extracted fields with original values and states (`confirmed`, `missing`, or `review`).
- `families`, `students`, and `family_education_finances`: owner-scoped family profiles, student planning data, and finance fields with explicit `confirmed`, `unknown`, or `review` states.
- `student_consultations`: the audited, one-to-one consultation-to-student association.
- `consultation_profile_proposals`: admin-reviewable extracted profile changes; proposal acceptance is the only path that changes existing student fields.
- `family_audit_events`: profile, association, proposal, and resolution audit records.
- `catalog_institutions`, `catalog_programs`, and source-backed program revisions with intake, requirement, international tuition, mandatory fee, verification, and historical effective-date data.

Financial numeric zero is stored as `review` unless the source value explicitly communicates zero. Missing values remain `missing`.

Family and student records may contain sensitive information about minors, including names, schools, academic history, goals, and financial context. Ordinary users are restricted to families they own; consultation association and proposal resolution are administrator-only. Do not place this data in logs, client-exposed environment variables, or unapproved exports. Financial fields extracted from calls remain review data and are not automatically copied into family finances.

Catalog records retain official evidence URL, publisher/authority, retrieval timestamp, academic year, verification status, and revision-specific facts. Missing deadlines, fees, or requirements are displayed as unconfirmed; stale or incomplete revisions are rejected by readiness checks.

## Account limitations

Registration creates only `user` accounts. Admins must be provisioned through the server-side bootstrap procedure; public registration cannot assign roles. Email and phone identifiers are stored as unverified because email/SMS verification is intentionally not implemented. Account recovery and password reset are deferred until ownership verification exists. Disabled accounts and changed credential versions invalidate Auth.js sessions on the next server-side session check.

To provision the first administrator, run the documented server-side bootstrap command with `ADMIN_BOOTSTRAP_SECRET`, `BOOTSTRAP_ADMIN_IDENTIFIER`, and `BOOTSTRAP_ADMIN_PASSWORD` set in the server environment. Never expose these variables to the browser.
