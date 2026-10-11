import { describe, expect, it } from "vitest";
import {
  academicYearSchema,
  evidenceSourceInputSchema,
  intakeInputSchema,
  institutionInputSchema,
  programFeeInputSchema,
  programInputSchema,
  programRevisionInputSchema,
} from "./schema";

const ids = {
  institution: "11111111-1111-4111-8111-111111111111",
  program: "22222222-2222-4222-8222-222222222222",
  source: "33333333-3333-4333-8333-333333333333",
  revision: "44444444-4444-4444-8444-444444444444",
};

describe("catalog validation", () => {
  it("requires consecutive academic years", () => {
    expect(academicYearSchema.safeParse("2026-2027").success).toBe(true);
    expect(academicYearSchema.safeParse("2026-2028").success).toBe(false);
  });

  it("requires provenance for institution and revision records", () => {
    expect(institutionInputSchema.safeParse({
      stableKey: "example-university",
      officialName: "Example University",
      countryCode: "IN",
      sourceId: ids.source,
    }).success).toBe(true);
    expect(institutionInputSchema.safeParse({
      stableKey: "example-university",
      officialName: "Example University",
      countryCode: "IN",
    }).success).toBe(false);

    expect(programRevisionInputSchema.safeParse({
      programId: ids.program,
      sourceId: ids.source,
      academicYear: "2026-2027",
      programTitle: "Example Master",
      retrievedAt: "2026-01-10T00:00:00.000Z",
    }).success).toBe(true);
  });

  it("validates degree classification, discipline, and stable program identity", () => {
    expect(programInputSchema.safeParse({
      institutionId: ids.institution,
      stableKey: "example-mba",
      degreeLevel: "master",
      discipline: "business",
      specialization: "finance",
    }).success).toBe(true);
    expect(programInputSchema.safeParse({
      institutionId: ids.institution,
      stableKey: "Example MBA",
      degreeLevel: "doctorate",
      discipline: "business",
    }).success).toBe(false);
  });

  it("rejects impossible dates and negative international fees", () => {
    expect(intakeInputSchema.safeParse({
      revisionId: ids.revision,
      intakeName: "Fall",
      startsOn: "2026-09-01",
      applicationDeadline: "2026-10-01",
    }).success).toBe(false);
    expect(programFeeInputSchema.safeParse({
      revisionId: ids.revision,
      feeType: "international_tuition",
      amount: -1,
      currency: "USD",
    }).success).toBe(false);
  });

  it("accepts official evidence metadata and rejects non-URLs", () => {
    expect(evidenceSourceInputSchema.safeParse({
      url: "https://university.example/programs/example",
      publisher: "Example University",
      authorityType: "university",
      retrievedAt: "2026-01-10T00:00:00.000Z",
    }).success).toBe(true);
    expect(evidenceSourceInputSchema.safeParse({
      url: "not-a-url",
      publisher: "Example University",
      authorityType: "university",
      retrievedAt: "2026-01-10T00:00:00.000Z",
    }).success).toBe(false);
  });
});
