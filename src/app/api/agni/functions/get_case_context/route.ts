import { handleCaseFunction } from "../_shared";
import { getCaseContextInputSchema } from "@/modules/cases/validation";
import { getCaseContext } from "@/modules/cases/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleCaseFunction(request, "get_case_context", getCaseContextInputSchema, getCaseContext);
}
