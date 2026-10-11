import { handleCaseFunction } from "../_shared";
import { qualifyStudent } from "@/modules/cases/advisory-service";
import { qualificationInputSchema } from "@/modules/cases/advisory-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleCaseFunction(request, "qualify_student", qualificationInputSchema, qualifyStudent);
}
