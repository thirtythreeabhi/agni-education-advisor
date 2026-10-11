import { handleCaseFunction } from "../_shared";
import { recordCaseUpdateInputSchema } from "@/modules/cases/validation";
import { recordCaseUpdate } from "@/modules/cases/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleCaseFunction(request, "record_case_update", recordCaseUpdateInputSchema, recordCaseUpdate);
}
