# Catalog import format v1

The admin importer accepts JSON only. It does not scrape URLs and it does not create or infer university data. Every record must be backed by an official source URL supplied by the operator.

```json
{
  "version": 1,
  "records": [
    {
      "institution": {
        "stableKey": "university-example",
        "officialName": "University Example",
        "countryCode": "IN"
      },
      "program": {
        "stableKey": "msc-example",
        "degreeLevel": "master",
        "discipline": "computer science",
        "specialization": "data systems",
        "title": "Master of Science in Data Systems"
      },
      "academicYear": "2026-2027",
      "source": {
        "url": "https://university.example/programs/msc-example",
        "publisher": "University Example",
        "authorityType": "university",
        "retrievedAt": "2026-01-10T00:00:00.000Z"
      },
      "effectiveFrom": "2026-01-01",
      "effectiveTo": null,
      "intakes": [{
        "intakeName": "Fall",
        "startsOn": "2026-09-01",
        "applicationDeadline": "2026-05-01"
      }],
      "requirements": [{
        "requirementType": "language",
        "description": "Official requirement text from the source"
      }],
      "fees": [{
        "feeType": "international_tuition",
        "amount": 12000,
        "currency": "USD",
        "description": "Per academic year"
      }]
    }
  ]
}
```

`version` must be `1`; dates are ISO dates; amounts are non-negative; and `degreeLevel` is `bachelor` or `master`. `mandatory` fees are separate records from `international_tuition`.

Preview validates every record and reports errors by record index. Execution is insert-only and repeatable: stable institution/program keys and the `(program, academicYear, source)` revision key deduplicate records. Existing names, classifications, revisions, facts, and verification statuses are never overwritten. Imported revisions always begin `unverified` and require an explicit admin review.

Readiness requires a verified revision with a verification timestamp, fresh evidence, a non-expired effective period, at least one intake with a deadline, at least one requirement, and both international tuition and mandatory fee facts. Until then, imported data is not recommendation-ready.
