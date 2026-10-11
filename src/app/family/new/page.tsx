"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFamilyAction } from "@/modules/families/actions";
import { ActionError, SubmitButton } from "../form-submit";

export default function NewFamilyPage() {
  const router = useRouter();
  const [state, formAction] = useActionState(createFamilyAction, {});
  useEffect(() => { if (state.redirectTo) router.push(state.redirectTo); }, [router, state.redirectTo]);
  return <main className="mx-auto max-w-2xl px-6 py-10"><Link href="/family" className="text-sm text-slate-600 hover:underline">← Family dashboard</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight">Create a family</h1><p className="mt-2 text-slate-600">Start a private profile for the students you are advising.</p><form action={formAction} className="mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><label>Family name<input name="name" required maxLength={160} placeholder="Sharma family" /></label><div><SubmitButton>Create family</SubmitButton><ActionError message={state.error} /></div></form></main>;
}
