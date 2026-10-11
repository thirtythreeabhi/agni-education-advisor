import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStudentForOwner } from "@/modules/families/queries";
import { StudentForm } from "@/app/family/student-form";

export default async function EditStudentPage({ params }: { params: Promise<{ familyId: string; studentId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { familyId, studentId } = await params;
  const result = await getStudentForOwner(session.user.id, familyId, studentId);
  if (!result) notFound();
  return <main className="mx-auto max-w-3xl px-6 py-10"><Link href={`/family/${familyId}/students/${studentId}`} className="text-sm text-slate-600 hover:underline">← {result.student.firstName} {result.student.lastName ?? ""}</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight">Edit student</h1><p className="mt-2 text-slate-600">Update academic details and preferences.</p><div className="mt-8"><StudentForm familyId={familyId} studentId={studentId} initial={result.student} /></div></main>;
}
