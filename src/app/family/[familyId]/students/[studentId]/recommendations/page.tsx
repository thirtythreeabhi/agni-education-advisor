import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudentForOwner } from "@/modules/families/queries";
import { getSavedRecommendationsForOwner } from "@/modules/cases/recommendation-queries";

export default async function RecommendationsPage({ params }: { params: Promise<{ familyId: string; studentId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { familyId, studentId } = await params;
  const studentResult = await getStudentForOwner(session.user.id, familyId, studentId);
  if (!studentResult) notFound();
  const { rows } = await getSavedRecommendationsForOwner(session.user.id, familyId, studentId);
  return <main className="mx-auto max-w-5xl px-6 py-10"><Link href={`/family/${familyId}/students/${studentId}`} className="text-sm text-slate-600 hover:underline">← Student profile</Link><header className="mt-6"><h1 className="text-3xl font-semibold tracking-tight">Saved program shortlist</h1><p className="mt-2 text-slate-600">Source-backed programs discussed with your advisor. Verify current requirements with the institution before applying.</p></header><section className="mt-8 grid gap-4">{rows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">No programs have been saved for this student yet.</div> : rows.map(({ recommendation, revision, institution, source }) => <article key={recommendation.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{revision.programTitle}</h2><p className="mt-1 text-sm text-slate-600">{institution.officialName} · {institution.countryCode} · {revision.academicYear}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">Saved</span></div><p className="mt-4">{recommendation.rationale}</p><p className="mt-3 text-sm text-slate-600">Source: <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a> · retrieved {source.retrievedAt.toLocaleDateString()}</p><p className="mt-2 text-xs text-slate-500">Program revision: {revision.id}</p></article>)}</section></main>;
}
