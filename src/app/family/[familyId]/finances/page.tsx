import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFamilyForOwner } from "@/modules/families/queries";
import FinanceForm from "./FinanceForm";

export default async function FinancePage({ params }: { params: Promise<{ familyId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { familyId } = await params;
  const result = await getFamilyForOwner(session.user.id, familyId);
  if (!result) notFound();
  return <main className="mx-auto max-w-2xl px-6 py-10"><Link href={`/family/${familyId}`} className="text-sm text-slate-600 hover:underline">← {result.family.name}</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight">Education finances</h1><p className="mt-2 text-slate-600">Amounts are whole Indian rupees from the Agni consultation contract. Unknown and review values remain explicitly labelled.</p><FinanceForm familyId={familyId} initial={result.finances ?? undefined} /></main>;
}
