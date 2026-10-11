import { describe, expect, it } from "vitest";
import { buildProfileProposals, mapExtractionField } from "./association";

const student = { firstName: "Asha", lastName: null, currentGrade: "12", schoolName: null, academicSummary: null, desiredDegree: null, careerGoals: null, preferredCountries: [], preferredIntake: null } as never;

describe("consultation profile proposals", () => {
  it("maps known Agni field names and leaves unknown fields unmapped", () => {
    expect(mapExtractionField("degree_level")).toBe("desiredDegree");
    expect(mapExtractionField("unknown_field")).toBeUndefined();
    expect(buildProfileProposals([{ id: "1", fieldName: "unknown_field", normalizedValue: "x", state: "confirmed" }], student)[0].state).toBe("unmapped");
  });

  it("preserves existing values by marking differences as conflicts", () => {
    const proposals = buildProfileProposals([
      { id: "1", fieldName: "first_name", normalizedValue: "Asha", state: "confirmed" },
      { id: "2", fieldName: "current_grade", normalizedValue: "11", state: "confirmed" },
      { id: "3", fieldName: "desired_degree", normalizedValue: "Computer Science", state: "confirmed" },
    ], student);
    expect(proposals[0].state).toBe("pending");
    expect(proposals[1].state).toBe("conflict");
    expect(proposals[2].state).toBe("pending");
  });
});
