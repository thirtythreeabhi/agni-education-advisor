import { describe, expect, it } from "vitest";
import { classifyMatch, matchCandidates, nextDisambiguationQuestion, normalizeInstitution, normalizeEducationText, type CaseCandidate } from "./matching";

const candidate = (overrides: Partial<CaseCandidate> = {}): CaseCandidate => ({
  familyId: crypto.randomUUID(), familyName: "Singh family", studentId: crypto.randomUUID(), firstName: "Akash", lastName: "Singh", schoolName: "Indian Institute of Technology Delhi", currentGrade: "12", desiredDegree: "Computer Science", preferredIntake: "Fall 2027", preferredCountries: ["India"], graduationYear: 2027, ...overrides,
});

describe("conversational case matching", () => {
  it("normalizes names and institution aliases deterministically", () => {
    expect(normalizeEducationText("  Singh-Family ")).toBe("singh family");
    expect(normalizeInstitution("IIT Delhi")).toBe("indian institute of technology delhi");
    expect(normalizeInstitution("IITD")).toBe("indian institute of technology delhi");
  });

  it("does not select among duplicate family names and duplicate students", () => {
    const matches = matchCandidates([candidate(), candidate({ familyId: crypto.randomUUID(), studentId: crypto.randomUUID() })], { familyName: "Singh", studentName: "Akash Singh" });
    expect(classifyMatch(matches, { familyName: "Singh", studentName: "Akash Singh" }).state).toBe("ambiguous");
  });

  it("uses IIT Delhi as a structured discriminator", () => {
    const matches = matchCandidates([candidate(), candidate({ familyId: crypto.randomUUID(), studentId: crypto.randomUUID(), schoolName: "Delhi Public School" })], { familyName: "Singh", studentName: "Akash Singh", schoolName: "IIT Delhi" });
    expect(matches).toHaveLength(1);
    expect(classifyMatch(matches, { familyName: "Singh", studentName: "Akash Singh", schoolName: "IIT Delhi" }).state).toBe("resolved");
  });

  it("keeps partial matches bounded and never picks the highest fuzzy score", () => {
    const matches = matchCandidates([candidate(), candidate({ firstName: "Akaash", familyId: crypto.randomUUID(), studentId: crypto.randomUUID() })], { familyName: "Singh", studentName: "Akash Singh" });
    expect(matches).toHaveLength(2);
    expect(classifyMatch(matches, { familyName: "Singh", studentName: "Akash Singh" }).state).toBe("ambiguous");
  });

  it("rejects contradictory details and reports no matches safely", () => {
    const facts = { familyName: "Singh", studentName: "Akash Singh", schoolName: "IIT Bombay" };
    const matches = matchCandidates([candidate()], facts);
    expect(classifyMatch(matches, facts).state).toBe("not_found");
  });

  it("asks for graduation year as the next discriminator", () => {
    expect(nextDisambiguationQuestion({ familyName: "Singh", studentName: "Akash Singh", schoolName: "IIT Delhi" }, [ { candidate: candidate(), fuzzy: false }, { candidate: candidate(), fuzzy: false } ])).toContain("graduating");
  });
});
