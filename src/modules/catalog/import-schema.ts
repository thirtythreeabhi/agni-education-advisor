import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD").refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "must be a real calendar date");
const stableKey = z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{1,99}$/, "must be a stable lowercase key");
const uuidOrGenerated = z.string().uuid();

export const catalogImportSourceSchema = z.object({
  url: z.string().url(),
  publisher: z.string().trim().min(1).max(300),
  authorityType: z.enum(["university", "government", "accreditor", "exam_body", "other_official"]),
  retrievedAt: z.coerce.date(),
});

export const catalogImportIntakeSchema = z.object({
  intakeName: z.string().trim().min(1).max(100),
  startsOn: dateOnly.nullable().optional(),
  applicationDeadline: dateOnly.nullable().optional(),
}).refine((value) => !value.startsOn || !value.applicationDeadline || value.applicationDeadline <= value.startsOn, "applicationDeadline must be on or before startsOn");

export const catalogImportRequirementSchema = z.object({
  requirementType: z.enum(["academic", "language", "entrance_exam", "document", "other"]),
  description: z.string().trim().min(1).max(2000),
});

export const catalogImportFeeSchema = z.object({
  feeType: z.enum(["international_tuition", "mandatory"]),
  amount: z.coerce.number().finite().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  description: z.string().trim().min(1).max(500).nullable().optional(),
});

export const catalogImportRecordSchema = z.object({
  institution: z.object({
    stableKey,
    officialName: z.string().trim().min(1).max(300),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
  }),
  program: z.object({
    stableKey,
    degreeLevel: z.enum(["bachelor", "master"]),
    discipline: z.string().trim().min(1).max(200),
    specialization: z.string().trim().min(1).max(200).nullable().optional(),
    title: z.string().trim().min(1).max(300),
  }),
  academicYear: z.string().regex(/^(\d{4})-(\d{4})$/).refine((value) => {
    const [start, end] = value.split("-").map(Number);
    return end === start + 1;
  }, "must span two consecutive academic years"),
  source: catalogImportSourceSchema,
  effectiveFrom: dateOnly.nullable().optional(),
  effectiveTo: dateOnly.nullable().optional(),
  intakes: z.array(catalogImportIntakeSchema).default([]),
  requirements: z.array(catalogImportRequirementSchema).default([]),
  fees: z.array(catalogImportFeeSchema).default([]),
}).strict().refine((value) => !value.effectiveFrom || !value.effectiveTo || value.effectiveTo >= value.effectiveFrom, "effectiveTo must be on or after effectiveFrom");

export const catalogImportEnvelopeSchema = z.object({
  version: z.literal(1),
  records: z.array(z.unknown()).min(1).max(1000),
});

export const catalogImportDocumentSchema = z.object({
  version: z.literal(1),
  records: z.array(catalogImportRecordSchema).min(1).max(1000),
});

export type CatalogImportRecord = z.infer<typeof catalogImportRecordSchema>;
export type CatalogImportDocument = z.infer<typeof catalogImportDocumentSchema>;
export type CatalogImportSource = z.infer<typeof catalogImportSourceSchema>;
export type CatalogImportError = { recordIndex: number | null; message: string; path?: string };

export function parseCatalogImportInput(input: unknown): unknown {
  if (typeof input !== "string") return input;
  return JSON.parse(input) as unknown;
}

export function formatZodIssues(error: z.ZodError, recordIndex: number | null = null): CatalogImportError[] {
  return error.issues.map((issue) => ({ recordIndex, path: issue.path.join("."), message: issue.message }));
}

export function previewCatalogImport(input: unknown) {
  let decoded: unknown;
  try {
    decoded = parseCatalogImportInput(input);
  } catch {
    return { validRecords: [] as CatalogImportRecord[], validRecordIndexes: [] as number[], errors: [{ recordIndex: null, path: "json", message: "Import must be valid JSON" }], totalRecords: 0 };
  }
  const envelope = catalogImportEnvelopeSchema.safeParse(decoded);
  if (!envelope.success) return { validRecords: [] as CatalogImportRecord[], validRecordIndexes: [] as number[], errors: formatZodIssues(envelope.error), totalRecords: 0 };
  const errors: CatalogImportError[] = [];
  const validRecords: CatalogImportRecord[] = [];
  const validRecordIndexes: number[] = [];
  envelope.data.records.forEach((record, index) => {
    const parsed = catalogImportRecordSchema.safeParse(record);
    if (parsed.success) { validRecords.push(parsed.data); validRecordIndexes.push(index); }
    else errors.push(...formatZodIssues(parsed.error, index));
  });
  return { validRecords, validRecordIndexes, errors, totalRecords: envelope.data.records.length };
}

export const catalogImportPreviewSchema = z.object({
  previewToken: uuidOrGenerated,
  validRecords: z.number().int().nonnegative(),
  errors: z.array(z.object({ recordIndex: z.number().nullable(), message: z.string(), path: z.string().optional() })),
});
