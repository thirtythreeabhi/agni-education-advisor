import { resolveCaseInputSchema } from "@/modules/cases/validation";
import { resolveCase } from "@/modules/cases/service";
import { handleCaseFunction } from "../_shared";

export const runtime = "nodejs";
export async function POST(request: Request) { return handleCaseFunction(request, "resolve_case", resolveCaseInputSchema, resolveCase); }
