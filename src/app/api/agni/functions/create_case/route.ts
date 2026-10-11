import { createCaseInputSchema } from "@/modules/cases/validation";
import { createCase } from "@/modules/cases/service";
import { handleCaseFunction } from "../_shared";

export const runtime = "nodejs";
export async function POST(request: Request) { return handleCaseFunction(request, "create_case", createCaseInputSchema, createCase); }
