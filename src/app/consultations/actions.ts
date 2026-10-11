"use server";

import { auth } from "@/auth";
import { associateConsultationAsAdmin, resolveProfileProposal } from "@/modules/consultations/association-service";
import { z } from "zod";

export type ConsultationActionState = { error?: string; redirectTo?: string; success?: boolean };

async function adminId() {
  const session = await auth();
  return session?.user?.role === "admin" ? session.user.id : undefined;
}

export async function associateConsultationAction(consultationId: string, _previous: ConsultationActionState, formData: FormData): Promise<ConsultationActionState> {
  const actorUserId = await adminId();
  if (!actorUserId) return { error: "Admin access is required for consultation association." };
  try {
    await associateConsultationAsAdmin(actorUserId, { consultationId, studentId: String(formData.get("studentId") ?? "") });
    return { redirectTo: `/consultations/${consultationId}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Select a valid student." };
    if (error instanceof Error && error.message === "CONSULTATION_ALREADY_ASSOCIATED") return { error: "This consultation is already associated with another student." };
    if (error instanceof Error && error.message === "CONSULTATION_NOT_FOUND") return { error: "Consultation not found." };
    return { error: "Unable to associate this consultation." };
  }
}

export async function resolveProfileProposalAction(proposalId: string, _previous: ConsultationActionState, formData: FormData): Promise<ConsultationActionState> {
  const actorUserId = await adminId();
  if (!actorUserId) return { error: "Admin access is required to resolve profile proposals." };
  try {
    await resolveProfileProposal(actorUserId, { proposalId, decision: String(formData.get("decision") ?? "") });
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Choose accept or reject." };
    if (error instanceof Error && error.message === "PROPOSAL_NOT_MAPPABLE") return { error: "This extracted field needs manual mapping before it can be applied." };
    if (error instanceof Error && error.message === "PROPOSAL_VALUE_MISSING") return { error: "The proposed value is missing and cannot be applied." };
    return { error: "Unable to resolve this proposal." };
  }
}
