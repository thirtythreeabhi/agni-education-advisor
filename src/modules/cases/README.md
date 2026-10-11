# Conversational cases

The first-stage Agni case functions use server-issued opaque bearer tokens because Agni's Custom Function contract does not document trusted live call metadata. A token is created by `create_case` and must be returned to every later `resolve_case` call. It is stored only as a SHA-256 hash and expires after 30 minutes.

## Matching rules

- Text is Unicode NFKD-normalized, diacritics removed, lowercased, punctuation converted to spaces, and whitespace collapsed.
- Family-name matching ignores a trailing `family` or `fam` suffix.
- Institution matching recognizes the verified built-in aliases `IIT Delhi`, `IITD`, and `Indian Institute of Technology Delhi` as one canonical value.
- Student names support exact normalized full-name matches and token-order-independent partial matches.
- Other supplied attributes—school, grade, degree, intake, country, and graduation year—must not contradict the stored candidate.
- Bounded fuzzy matching allows at most one edit for values of at least five characters. Fuzzy candidates are never ranked and selected by score; multiple eligible candidates remain `ambiguous`.
- States are `provisional`/`not_found`, `ambiguous`, and `resolved`. A guest/private resolution never returns student details until a separate trusted authorization mechanism exists.

## Function authentication

The request header name defaults to `x-agni-case-function-secret` and can be changed with `AGNI_CASE_FUNCTION_HEADER_NAME`. Configure separate secrets:

- `AGNI_CASE_FUNCTION_SECRET`: real/guest calls; no private record disclosure without authorization.
- `AGNI_DEMO_CASE_FUNCTION_SECRET`: isolated fictional demo calls; may resolve seeded demo data without login.

The `demo` mode is derived from the server secret, never from request JSON.

## Persistent case memory

Memory is append-oriented and student-scoped. Each item retains a stable key, category, status, source, statement, optional structured value, timestamps, and the originating consultation when available. The supported categories are `confirmed_profile`, `caller_reported`, `preference`, `decision`, `proposed_change`, `unresolved_question`, `promised_action`, `follow_up_outcome`, and `discussed_university`.

Post-call consolidation reads only explicit structured fields from `post_call_analysis`: `memory_items`, `confirmed_profile`, `caller_reported`, `preferences`, `decisions`, `proposed_changes`, `unresolved_questions`, `promised_actions`, `follow_up_outcomes`, and `discussed_universities`. A narrative summary or transcript is never converted into a memory item. Fingerprints make retries idempotent, while later outcomes and conflicts remain separate records and can resolve an earlier open question.

`get_case_context` returns a small brief by default. Use `detail: "evidence"` or `"all"` only when the voice flow needs supporting history. Verified demo cases may receive student-scoped evidence and the last five consultation summaries; unverified real/guest cases receive only memory attached to their opaque case token and never private student history.

## Agni function configuration

Configure each Custom Server-Side Function as an HTTPS `POST` to the matching route. Send the secret in the header `x-agni-case-function-secret` (or the name configured by `AGNI_CASE_FUNCTION_HEADER_NAME`). Use `AGNI_DEMO_CASE_FUNCTION_SECRET` only for isolated fictional demo records and `AGNI_CASE_FUNCTION_SECRET` for real/guest traffic. The response envelope is `{ "ok": true, "data": ... }`; errors are `{ "ok": false, "error": "..." }`.

- `create_case`: `{ callerName?, studentName?, familyName?, schoolName?, currentGrade?, desiredDegree?, preferredIntake?, preferredCountry?, graduationYear? }`. Returns an opaque `caseToken`, expiry, and provisional state.
- `resolve_case`: `{ caseToken?, familyName?, studentName?, schoolName?, currentGrade?, desiredDegree?, preferredIntake?, preferredCountry?, graduationYear? }`. Repeat with additional caller-supplied facts until the state is `resolved`, `ambiguous`, or `not_found`; use the returned `nextQuestion` verbatim or as the next natural prompt. Never supply or ask Agni to invent database IDs.
- `get_case_context`: `{ caseToken, detail?: "brief"|"evidence"|"all", categories?: [the category strings above] }`. Start with `brief`; it includes unresolved questions, promised actions, outcomes, decisions, and discussed universities.
- `record_case_update`: `{ caseToken, memoryKey, category, statement, value?, status?: "active"|"resolved"|"superseded"|"rejected"|"uncertain"|"conflicted", resolvesMemoryKey? }`. A follow-up answer should add a `follow_up_outcome` and set `resolvesMemoryKey` to the earlier unresolved question key. Real/guest calls cannot assert `confirmed_profile`.

For the accommodation example, the structured first-call extraction should include an unresolved item such as `{ "key": "accommodation_sister_germany", "category": "unresolved_question", "statement": "The family will ask their sister whether Akash can stay at her home in Germany.", "status": "active" }`. After the caller says she agreed, call `record_case_update` with a `follow_up_outcome`, a natural statement, `status: "resolved"`, and `resolvesMemoryKey: "accommodation_sister_germany"`. The next `get_case_context` brief will contain the outcome and no longer list that question as open.

No trusted Agni call/session identifier is assumed. The opaque case token must be carried in the function arguments across Web Calls. The existing `call_completed` webhook remains responsible for consultation ingestion, extraction, association, and proposal review; when a consultation is associated, structured memory is consolidated transactionally and safely retried.

## Advisory functions and catalog safety

The complete Custom Function set is `create_case`, `resolve_case`, `get_case_context`, `record_case_update`, `qualify_student`, `search_programs`, and `save_recommendations`.

- `qualify_student` is `POST /api/agni/functions/qualify_student`. It accepts `{ caseToken, degreeLevel?: "bachelor"|"master", academicBackground?, grades?, specialization?, careerObjectives?, countries?: string[], intendedIntake?, educationSavingsInr?: integer >= 0, potentialLoanInr?: integer >= 0, householdIncomeInr?: integer >= 0, languageDetails?, entranceRequirements? }`. Missing fields are returned as `missingInformation`, never treated as a rejection.
- `search_programs` is `POST /api/agni/functions/search_programs`. It accepts `{ caseToken, degreeLevel?, specialization?, countries?: string[], intendedIntake?, query?, maxResults?: 1..10 }`. It returns opaque `programKey` values, published eligibility requirements, future intakes/deadlines, tuition and mandatory fees with currencies, financial-gap limitations, and official source citations. It returns no result for catalog revisions that are not verified, current, source-backed, deadline-ready, requirement-complete, or fee-complete.
- `save_recommendations` is `POST /api/agni/functions/save_recommendations`. It accepts `{ caseToken, recommendations: [{ programKey, rationale, assessment?: { fit: "strong_match"|"possible_match"|"needs_verification"|"not_assessable", notes?: string[] } }] }`. The server verifies each opaque key against the case and re-checks the revision; raw catalog IDs are not accepted as selection inputs. Saved entries retain their revision ID, rationale, assessment, case, student when resolved, and consultation link when the call is associated.

All three use `POST`, the `x-agni-case-function-secret` header, the same server-to-server timeout and rate-limit policy as the other functions, and the `{ ok, data }` response envelope. Set a Custom Function timeout of 10 seconds for `qualify_student` and `save_recommendations`, and 15 seconds for `search_programs`; retry only idempotent calls with the same arguments. Use the same demo secret for fictional fixtures and the real/guest secret for real traffic.

The Agni system prompt should say: collect and pass caller-supplied facts to `qualify_student`; call `search_programs` only after enough filters are available; discuss only returned programs and cite the returned publisher/URL; describe missing requirements, living costs, scholarships, outcomes, fee periods, and admission probability as unknown when the source does not state them; never infer an admission chance; pass only returned `programKey` values to `save_recommendations`; and call `get_case_context` at the start of a verified returning call. Do not manufacture a program, database ID, source, deadline, fee, scholarship, or outcome.

The parent-facing shortlist is available at `/family/{familyId}/students/{studentId}/recommendations` and is owner-scoped. It displays saved program title, institution, academic year, rationale, revision ID, and the stored official source citation. An empty catalog produces an empty shortlist and a safe “no verified/current result” response; no fictional production program is seeded.
