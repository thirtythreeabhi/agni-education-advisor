import { handleCaseFunction } from "../_shared";
import { searchPrograms } from "@/modules/cases/advisory-service";
import { searchProgramsInputSchema } from "@/modules/cases/advisory-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleCaseFunction(request, "search_programs", searchProgramsInputSchema, searchPrograms);
}
