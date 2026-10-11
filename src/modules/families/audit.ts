import type { familyAuditEventType } from "@/db/schema";

export type FamilyAuditEventType = (typeof familyAuditEventType.enumValues)[number];

export function auditChanges(before: Record<string, unknown> | null, after: Record<string, unknown>) {
  if (!before) return after;
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => before[key] !== value).map(([key, value]) => [key, { from: before[key], to: value }]));
}

export function isMeaningfulAuditChange(changes: Record<string, unknown>) {
  return Object.keys(changes).length > 0;
}
