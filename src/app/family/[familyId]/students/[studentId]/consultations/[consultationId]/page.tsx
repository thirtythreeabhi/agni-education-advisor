import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getConsultationForStudentOwner } from "@/modules/families/queries";

function label(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export default async function StudentConsultationPage({ params }: { params: Promise<{ familyId: string; studentId: string; consultationId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { familyId, studentId, consultationId } = await params;
  const result = await getConsultationForStudentOwner(session.user.id, familyId, studentId, consultationId);
  if (!result) notFound();
  const { consultation, extractions } = result;
  return <main className="mx-auto max-w-4xl px-6 py-10"><Link href={`/family/${familyId}/students/${studentId}`} className="text-sm text-slate-600 hover:underline">← Student profile</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight">Consultation details</h1><section className="mt-8 card"><p><strong>Session:</strong> {consultation.agniSessionId}</p><p><strong>Date:</strong> {consultation.createdAt.toLocaleString()}</p><p><strong>Status:</strong> {consultation.agniStatus ?? "Not supplied"}</p><p><strong>Duration:</strong> {consultation.durationSec === null ? "Not supplied" : `${consultation.durationSec} seconds`}</p><p><strong>Association:</strong> Confirmed to this student</p></section><section className="mt-8"><h2 className="text-xl font-semibold">Extracted planning details</h2><div className="mt-3 grid gap-3">{extractions.length === 0 ? <div className="card">No extracted planning details were supplied.</div> : extractions.map((extraction) => <div className="card" key={extraction.fieldName}><div className="flex items-start justify-between gap-4"><strong>{label(extraction.fieldName)}</strong><span className="pill">{extraction.state}</span></div><p className="mt-2">{extraction.normalizedValue === null ? "Not confirmed" : typeof extraction.normalizedValue === "string" ? extraction.normalizedValue : JSON.stringify(extraction.normalizedValue)}</p></div>)}</div></section><p className="mt-8 text-sm text-slate-600">Transcript and provider payload details are restricted to administrators.</p></main>;
}
