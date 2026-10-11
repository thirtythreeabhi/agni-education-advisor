import { handleCaseFunction } from "../_shared";
import { saveRecommendations } from "@/modules/cases/advisory-service";
import { saveRecommendationsInputSchema } from "@/modules/cases/advisory-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleCaseFunction(request, "save_recommendations", saveRecommendationsInputSchema, saveRecommendations);
}
