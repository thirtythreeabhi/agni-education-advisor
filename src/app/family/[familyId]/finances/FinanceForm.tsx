"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateFinancesAction, type FormActionState } from "@/modules/families/actions";
import { ActionError, SubmitButton } from "@/app/family/form-submit";

type FinanceValues = { educationSavingsInr: number | null; proposedLoanInr: number | null; annualHouseholdIncomeInr: number | null; educationSavingsState: string; proposedLoanState: string; annualHouseholdIncomeState: string; fundingSource: string | null; fundingSourceState: string; financialAidNeeded: boolean | null; financialAidState: string; notes: string | null };

export default function FinanceForm({ familyId, initial }: { familyId: string; initial?: FinanceValues }) {
  const router = useRouter();
  const [state, formAction] = useActionState<FormActionState, FormData>(updateFinancesAction.bind(null, familyId), {});
  useEffect(() => { if (state.redirectTo) router.push(state.redirectTo); }, [router, state.redirectTo]);
  return <form action={formAction} className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><MoneyField name="educationSavingsInr" label="Education savings (INR)" value={initial?.educationSavingsInr} /><StateField name="educationSavingsState" value={initial?.educationSavingsState} /><MoneyField name="proposedLoanInr" label="Proposed loan (INR)" value={initial?.proposedLoanInr} /><StateField name="proposedLoanState" value={initial?.proposedLoanState} /><MoneyField name="annualHouseholdIncomeInr" label="Annual household income (INR)" value={initial?.annualHouseholdIncomeInr} /><StateField name="annualHouseholdIncomeState" value={initial?.annualHouseholdIncomeState} /><label>Funding source<input name="fundingSource" defaultValue={initial?.fundingSource ?? ""} /></label><label>Funding source status<select name="fundingSourceState" defaultValue={initial?.fundingSourceState ?? "unknown"}><option value="unknown">Unknown</option><option value="review">Needs review</option><option value="confirmed">Confirmed</option></select></label><label>Financial aid needed<select name="financialAidNeeded" defaultValue={initial?.financialAidNeeded === null || initial?.financialAidNeeded === undefined ? "unknown" : initial.financialAidNeeded ? "yes" : "no"}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label><label>Financial aid status<select name="financialAidState" defaultValue={initial?.financialAidState ?? "unknown"}><option value="unknown">Unknown</option><option value="review">Needs review</option><option value="confirmed">Confirmed</option></select></label><label>Notes<textarea name="notes" rows={4} defaultValue={initial?.notes ?? ""} /></label><div><SubmitButton>Save finances</SubmitButton><ActionError message={state.error} /></div></form>;
}

function MoneyField({ name, label, value }: { name: string; label: string; value?: number | null }) { return <label>{label}<input name={name} type="number" min="0" step="1" inputMode="numeric" defaultValue={value ?? ""} /></label>; }
function StateField({ name, value }: { name: string; value?: string }) { return <label>{name.replace(/State$/, "")} status<select name={name} defaultValue={value ?? "unknown"}><option value="unknown">Unknown</option><option value="review">Needs review</option><option value="confirmed">Confirmed</option></select></label>; }
