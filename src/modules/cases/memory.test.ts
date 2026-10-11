import { describe, expect, it } from "vitest";
import { buildCompactBrief, extractPostCallMemory } from "./memory";

describe("case memory", () => {
  it("accepts only explicit structured post-call memory and preserves categories", () => {
    const items = extractPostCallMemory({
      summary: "A call summary is not itself a memory item.",
      memory_items: [
        { key: "profile", category: "confirmed_profile", statement: "Akash is in grade 12." },
        { key: "sister_germany", category: "unresolved_question", statement: "Ask sister whether Akash can stay in Germany." },
      ],
      preferences: ["Computer science"],
      discussed_universities: [{ key: "iit-delhi", statement: "IIT Delhi was discussed." }],
    });
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ memoryKey: "profile", category: "confirmed_profile" }),
      expect.objectContaining({ memoryKey: "sister_germany", category: "unresolved_question" }),
      expect.objectContaining({ category: "preference", statement: "Computer science" }),
      expect.objectContaining({ category: "discussed_university" }),
    ]));
    expect(items).toHaveLength(4);
    expect(extractPostCallMemory({ summary: "Only narrative, no structured items." })).toEqual([]);
  });

  it("keeps unresolved questions in the compact brief and excludes resolved ones", () => {
    const now = new Date();
    const make = (category: string, status: string, statement: string, key: string) => ({
      id: crypto.randomUUID(), caseId: null, studentId: crypto.randomUUID(), sourceConsultationId: null,
      memoryKey: key, category, status, source: "caller", statement, value: null,
      fingerprint: crypto.randomUUID(), createdAt: now, updatedAt: now,
    });
    const brief = buildCompactBrief([
      make("unresolved_question", "active", "Ask sister about Germany.", "sister_germany"),
      make("unresolved_question", "resolved", "Already answered.", "old_question"),
      make("follow_up_outcome", "resolved", "Sister agreed.", "sister_germany_outcome"),
    ] as never);
    expect(brief.openQuestions).toHaveLength(1);
    expect(brief.openQuestions[0].statement).toContain("sister");
    expect(brief.recentOutcomes[0].statement).toBe("Sister agreed.");
  });
});
