"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { associateConsultationAction, type ConsultationActionState } from "./actions";

type StudentOption = { id: string; firstName: string; lastName: string | null; familyName: string };

export function AssociationForm({ consultationId, students }: { consultationId: string; students: StudentOption[] }) {
  const [state, formAction] = useActionState<ConsultationActionState, FormData>(associateConsultationAction.bind(null, consultationId), {});
  const router = useRouter();
  useEffect(() => { if (state.redirectTo) router.push(state.redirectTo); }, [router, state.redirectTo]);
  return <form action={formAction} className="mt-4 grid gap-3"><label>Student<select name="studentId" required defaultValue=""><option value="" disabled>Select a student</option>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName ?? ""} · {student.familyName}</option>)}</select></label><button type="submit">Associate consultation</button>{state.error ? <p role="alert" className="text-sm text-red-700">{state.error}</p> : null}</form>;
}
