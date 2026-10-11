"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addStudentAction, updateStudentAction, type FormActionState } from "@/modules/families/actions";
import { ActionError, SubmitButton } from "./form-submit";

type StudentValues = { firstName: string; lastName: string | null; currentGrade: string | null; schoolName: string | null; academicSummary: string | null; desiredDegree: string | null; careerGoals: string | null; preferredCountries: string[]; preferredIntake: string | null };

export function StudentForm({ familyId, studentId, initial }: { familyId: string; studentId?: string; initial?: StudentValues }) {
  const action = studentId ? updateStudentAction.bind(null, familyId, studentId) : addStudentAction.bind(null, familyId);
  const [state, formAction] = useActionState<FormActionState, FormData>(action, {});
  const router = useRouter();
  useEffect(() => { if (state.redirectTo) router.push(state.redirectTo); }, [router, state.redirectTo]);
  return <form action={formAction} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="grid gap-4 sm:grid-cols-2">
      <label>First name<input name="firstName" defaultValue={initial?.firstName ?? ""} required maxLength={100} /></label>
      <label>Last name<input name="lastName" defaultValue={initial?.lastName ?? ""} maxLength={100} /></label>
      <label>Current grade<input name="currentGrade" defaultValue={initial?.currentGrade ?? ""} /></label>
      <label>School or institution<input name="schoolName" defaultValue={initial?.schoolName ?? ""} /></label>
      <label>Desired degree<input name="desiredDegree" defaultValue={initial?.desiredDegree ?? ""} /></label>
      <label>Preferred intake<input name="preferredIntake" defaultValue={initial?.preferredIntake ?? ""} placeholder="Fall 2027" /></label>
    </div>
    <label>Academic details<textarea name="academicSummary" defaultValue={initial?.academicSummary ?? ""} rows={4} /></label>
    <label>Career goals<textarea name="careerGoals" defaultValue={initial?.careerGoals ?? ""} rows={4} /></label>
    <label>Preferred countries <span className="muted">(comma separated)</span><input name="preferredCountries" defaultValue={initial?.preferredCountries.join(", ") ?? ""} placeholder="Canada, Germany" /></label>
    <div><SubmitButton>{studentId ? "Save changes" : "Add student"}</SubmitButton><ActionError message={state.error} /></div>
  </form>;
}
