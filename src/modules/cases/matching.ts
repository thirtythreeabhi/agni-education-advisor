import type { CaseFacts } from "./validation";

export type CaseCandidate = {
  familyId: string;
  familyName: string;
  studentId: string;
  firstName: string;
  lastName: string | null;
  schoolName: string | null;
  currentGrade: string | null;
  desiredDegree: string | null;
  preferredIntake: string | null;
  preferredCountries: string[];
  graduationYear: number | null;
};

export type CandidateMatch = { candidate: CaseCandidate; fuzzy: boolean };

const aliases: Record<string, string> = {
  iitd: "indian institute of technology delhi",
  "iit delhi": "indian institute of technology delhi",
  "indian institute of technology delhi": "indian institute of technology delhi",
};

export function normalizeEducationText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeInstitution(value: string) {
  const normalized = normalizeEducationText(value);
  return aliases[normalized] ?? normalized;
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[right.length];
}

function boundedEqual(input: string, stored: string, institution = false) {
  const left = institution ? normalizeInstitution(input) : normalizeEducationText(input);
  const right = institution ? normalizeInstitution(stored) : normalizeEducationText(stored);
  if (!left || !right) return { matches: false, fuzzy: false };
  if (left === right) return { matches: true, fuzzy: false };
  if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 1) return { matches: false, fuzzy: false };
  return { matches: editDistance(left, right) === 1, fuzzy: true };
}

function familyNamesEqual(input: string, stored: string) {
  const stripSuffix = (value: string) => normalizeEducationText(value).replace(/\s+(family|fam)$/i, "");
  const left = stripSuffix(input);
  const right = stripSuffix(stored);
  if (left === right) return { matches: true, fuzzy: false };
  if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 1) return { matches: false, fuzzy: false };
  return { matches: editDistance(left, right) === 1, fuzzy: true };
}

function nameParts(value: string) {
  return normalizeEducationText(value).split(" ").filter(Boolean);
}

function candidateStudentName(candidate: CaseCandidate) {
  return [candidate.firstName, candidate.lastName].filter(Boolean).join(" ");
}

function matchesCountries(input: string, countries: string[]) {
  return countries.some((country) => boundedEqual(input, country).matches);
}

export function matchCandidates(candidates: CaseCandidate[], facts: CaseFacts): CandidateMatch[] {
  return candidates.flatMap((candidate) => {
    let fuzzy = false;
    if (facts.familyName) {
      const result = familyNamesEqual(facts.familyName, candidate.familyName);
      if (!result.matches) return [];
      fuzzy ||= result.fuzzy;
    }
    if (facts.studentName) {
      const supplied = nameParts(facts.studentName);
      const stored = nameParts(candidateStudentName(candidate));
      const result = boundedEqual(facts.studentName, candidateStudentName(candidate));
      const tokenMatch = supplied.length > 1 && supplied.every((token) => stored.includes(token));
      if (!result.matches && !tokenMatch) return [];
      fuzzy ||= result.fuzzy && !tokenMatch;
    }
    if (facts.schoolName) {
      const result = boundedEqual(facts.schoolName, candidate.schoolName ?? "", true);
      if (!result.matches) return [];
      fuzzy ||= result.fuzzy;
    }
    if (facts.currentGrade && !boundedEqual(facts.currentGrade, candidate.currentGrade ?? "").matches) return [];
    if (facts.desiredDegree && !boundedEqual(facts.desiredDegree, candidate.desiredDegree ?? "").matches) return [];
    if (facts.preferredIntake && !boundedEqual(facts.preferredIntake, candidate.preferredIntake ?? "").matches) return [];
    if (facts.preferredCountry && !matchesCountries(facts.preferredCountry, candidate.preferredCountries)) return [];
    if (facts.graduationYear !== undefined && facts.graduationYear !== candidate.graduationYear) return [];
    return [{ candidate, fuzzy }];
  });
}

export function nextDisambiguationQuestion(facts: CaseFacts, candidates: CandidateMatch[]) {
  const has = (key: keyof CaseFacts) => facts[key] !== undefined;
  if (!has("schoolName")) return "What school or university does the student attend?";
  if (!has("graduationYear")) return "What year is the student graduating?";
  if (!has("currentGrade")) return "What grade or year is the student currently in?";
  if (!has("desiredDegree")) return "What degree or course is the student interested in?";
  return candidates.length > 1 ? "What is another detail that distinguishes the student, such as their preferred intake?" : "Could you provide one more detail about the student?";
}

export function classifyMatch(matches: CandidateMatch[], facts: CaseFacts) {
  if (matches.length === 0) return { state: "not_found" as const, matches };
  if (matches.length > 1) return { state: "ambiguous" as const, matches, nextQuestion: nextDisambiguationQuestion(facts, matches) };
  return { state: "resolved" as const, matches };
}
