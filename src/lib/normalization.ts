import { isExtractedField } from "./agni-schema";

const financialFields = new Set(["education_savings_inr", "proposed_loan_inr", "annual_household_income_inr"]);

export type NormalizedExtraction = {
  fieldName: string;
  fieldType: string;
  originalValue: unknown;
  normalizedValue: unknown;
  state: "confirmed" | "missing" | "review";
};

function explicitZeroEvidence(value: unknown) {
  if (typeof value !== "string") return false;
  return /^(zero|nil|none|0|no savings|no loan|no income)$/i.test(value.trim());
}

function isPlaceholder(value: unknown) {
  return typeof value === "string" && /^(n\/a|na|unknown|not provided|not discussed|unsure|prefer not to say)$/i.test(value.trim());
}

function normalizeField(fieldName: string, field: { type: string; value: unknown }): NormalizedExtraction {
  const missing = field.value === null || field.value === undefined || field.value === "" || isPlaceholder(field.value);
  if (missing) return { fieldName, fieldType: field.type, originalValue: field.value, normalizedValue: null, state: "missing" };
  if (financialFields.has(fieldName) && field.type === "number" && field.value === 0) {
    return { fieldName, fieldType: field.type, originalValue: field.value, normalizedValue: null, state: "review" };
  }
  if (financialFields.has(fieldName) && typeof field.value === "string" && explicitZeroEvidence(field.value)) {
    return { fieldName, fieldType: field.type, originalValue: field.value, normalizedValue: 0, state: "confirmed" };
  }
  return { fieldName, fieldType: field.type, originalValue: field.value, normalizedValue: field.value, state: "confirmed" };
}

export function normalizeExtractedFields(value: unknown): NormalizedExtraction[] {
  const results: NormalizedExtraction[] = [];
  function visit(current: unknown, path: string[] = []) {
    if (isExtractedField(current)) {
      const fieldName = [...path].reverse().find((segment) => !/^\d+$/.test(segment));
      if (fieldName) results.push(normalizeField(fieldName, current));
      return;
    }
    if (Array.isArray(current)) return current.forEach((child, index) => visit(child, [...path, String(index)]));
    if (current && typeof current === "object") {
      Object.entries(current).forEach(([key, child]) => visit(child, [...path, key]));
    }
  }
  visit(value);
  const byName = new Map<string, NormalizedExtraction>();
  for (const result of results) {
    const previous = byName.get(result.fieldName);
    if (!previous) {
      byName.set(result.fieldName, result);
      continue;
    }
    const same = JSON.stringify(previous.normalizedValue) === JSON.stringify(result.normalizedValue) && previous.state === result.state;
    if (!same) {
      byName.set(result.fieldName, {
        fieldName: result.fieldName,
        fieldType: result.fieldType,
        originalValue: [previous.originalValue, result.originalValue],
        normalizedValue: null,
        state: "review",
      });
    }
  }
  return [...byName.values()];
}
