import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFamilyForOwner } from "@/modules/families/queries";
import { StudentForm } from "@/app/family/student-form";

export default async function NewStudentPage({ params }: { params: Promise<{ familyId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { familyId } = await params;
  const family = await getFamilyForOwner(session.user.id, familyId);
  if (!family) notFound();
  return <main className="mx-auto max-w-3xl px-6 py-10"><Link href={`/family/${familyId}`} className="text-sm text-slate-600 hover:underline">← {family.family.name}</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight">Add student</h1><p className="mt-2 text-slate-600">Add the academic and planning details you currently know.</p><div className="mt-8"><StudentForm familyId={familyId} /></div></main>;
}
