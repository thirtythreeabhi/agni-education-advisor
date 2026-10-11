"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveProfileProposalAction, type ConsultationActionState } from "./actions";

export function ProposalForm({ proposalId, disabled }: { proposalId: string; disabled?: boolean }) {
  const [state, formAction] = useActionState<ConsultationActionState, FormData>(resolveProfileProposalAction.bind(null, proposalId), {});
  const router = useRouter();
  useEffect(() => { if (state.success) router.refresh(); }, [router, state.success]);
  if (disabled) return null;
  return <form action={formAction} className="mt-3 flex flex-wrap gap-2"><button name="decision" value="accept" type="submit">Accept change</button><button name="decision" value="reject" type="submit" className="border border-slate-300 bg-white text-slate-900">Reject</button>{state.error ? <p role="alert" className="basis-full text-sm text-red-700">{state.error}</p> : null}</form>;
}
