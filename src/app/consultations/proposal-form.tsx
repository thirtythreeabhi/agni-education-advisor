"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveProfileProposalAction, type ConsultationActionState } from "./actions";

export function ProposalForm({ proposalId, disabled, correctedValue }: { proposalId: string; disabled?: boolean; correctedValue: string }) {
  const [state, formAction] = useActionState<ConsultationActionState, FormData>(resolveProfileProposalAction.bind(null, proposalId), {});
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  if (disabled) return null;
  return <form action={formAction} className="mt-3 grid gap-2"><label>Corrected / validated value<input name="correctedValue" defaultValue={correctedValue === "Not provided" ? "" : correctedValue} aria-label="Corrected or validated value" /></label><div className="flex flex-wrap gap-2"><button name="decision" value="keep_existing" type="submit">Keep existing</button><button name="decision" value="reject_extracted" type="submit" className="secondary-button">Reject extracted</button><button name="decision" value="apply_corrected" type="submit">Apply corrected value</button></div>{state.error ? <p role="alert" className="basis-full form-error text-sm">{state.error}</p> : null}</form>;
}
