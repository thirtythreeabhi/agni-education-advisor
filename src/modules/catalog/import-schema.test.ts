import { describe, expect, it } from "vitest";
import { previewCatalogImport } from "./import-schema";

const validRecord = {
  institution: { stableKey: "example-university", officialName: "Example University", countryCode: "IN" },
  program: { stableKey: "msc-example", degreeLevel: "master", discipline: "computer science", title: "Master of Science" },
  academicYear: "2026-2027",
  source: { url: "https://university.example/program", publisher: "Example University", authorityType: "university", retrievedAt: "2026-01-10T00:00:00.000Z" },
  intakes: [],
  requirements: [],
  fees: [],
};

describe("catalog import format", () => {
  it("reports malformed records individually while preserving valid records for preview", () => {
    const result = previewCatalogImport(JSON.stringify({ version: 1, records: [validRecord, { ...validRecord, academicYear: "2026-2028" }] }));
    expect(result.totalRecords).toBe(2);
    expect(result.validRecords).toHaveLength(1);
    expect(result.validRecordIndexes).toEqual([0]);
    expect(result.errors.some((error) => error.recordIndex === 1 && error.path === "academicYear")).toBe(true);
  });

  it("rejects unknown document versions and invalid JSON", () => {
    expect(previewCatalogImport("not json").errors[0].message).toBe("Import must be valid JSON");
    expect(previewCatalogImport({ version: 2, records: [] }).errors.some((error) => error.path === "version")).toBe(true);
  });

  it("rejects verification claims because imports always start unverified", () => {
    const result = previewCatalogImport({ version: 1, records: [{ ...validRecord, verificationStatus: "verified" }] });
    expect(result.validRecords).toHaveLength(0);
    expect(result.errors[0].recordIndex).toBe(0);
  });
});
