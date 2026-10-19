import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFamilyMembersForAdmin } from "@/modules/families/admin-queries";
import { getFamilyForOwner, getFamilyOwnerEmailForMemberView } from "@/modules/families/queries";
import MembersAccess from "./MembersAccess";

function State({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs ${value === "confirmed" ? "bg-emerald-100 text-emerald-800" : value === "review" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{value}</span>;
}

function formatInr(value: number | null) {
  return value === null ? "Not provided" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatLegacyBudget(value: number | null, currency: string | null) {
  return value === null ? "Not provided" : `${currency ?? "Currency not set"} ${(value / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (legacy minor-unit value)`;
}

function FamilyTabs({ familyId, active }: { familyId: string; active: "overview" | "members" }) {
  const tabs = [
    { id: "overview", label: "Family information", href: `/family/${familyId}` },
    { id: "members", label: "Members & Access", href: `/family/${familyId}?tab=members` },
  ] as const;

  return <nav className="mt-7 flex gap-2 border-b border-border" aria-label="Family sections">
    {tabs.map((tab) => <Link key={tab.id} href={tab.href} aria-current={active === tab.id ? "page" : undefined} className={`rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition ${active === tab.id ? "border-primary text-primary" : "border-transparent text-secondary hover:bg-page hover:text-content"}`}>
      {tab.label}
    </Link>)}
  </nav>;
}

export default async function FamilyPage({
  params,
  searchParams,
}: {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [{ familyId }, query] = await Promise.all([params, searchParams]);
  const activeTab = query.tab === "members" ? "members" : "overview";
  const result = await getFamilyForOwner(session.user.id, familyId);

  // Admins receive a separate, minimal read model for this tab only. The
  // existing owner-scoped route and all student/finance reads remain intact.
  if (!result && session.user.role === "admin" && activeTab === "members") {
    const adminView = await getFamilyMembersForAdmin(familyId);
    if (!adminView) notFound();
    return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      <Link href="/family" className="text-sm text-secondary hover:underline">← Families</Link>
      <header className="mt-6"><p className="text-sm font-medium text-primary">Admin family access</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-content">{adminView.family.name}</h1><p className="mt-2 text-secondary">This admin view is limited to Members &amp; Access. Family profiles and finances remain owner-scoped.</p></header>
      <MembersAccess
        ownerName="Family owner"
        ownerEmail={adminView.ownerEmail}
        students={adminView.students.map((student) => ({ id: student.id, name: `${student.firstName} ${student.lastName ?? ""}`.trim() }))}
        canManageInvitations
      />
    </main>;
  }

  if (!result) notFound();
  const { family, students, finances } = result;
  const isOwner = family.ownerUserId === session.user.id;
  const canManageInvitations = (session.user.role === "admin" || session.user.role === "user") && isOwner;
  const ownerEmail = activeTab === "members" ? await getFamilyOwnerEmailForMemberView(session.user.id, familyId) : session.user.email ?? null;

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
    <Link href="/family" className="text-sm text-secondary hover:underline">← Families</Link>
    <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight text-content">{family.name}</h1><p className="mt-2 text-secondary">Student profiles, finances, and family access.</p></div>
      {activeTab === "overview" && <Link href={`/family/${family.id}/students/new`} className="button-primary rounded-lg px-4 py-2.5 text-sm font-medium">Add student</Link>}
    </header>

    <FamilyTabs familyId={family.id} active={activeTab} />

    {activeTab === "members" ? <MembersAccess
      ownerName={session.user.name || "You"}
      ownerEmail={ownerEmail}
      students={students.map((student) => ({ id: student.id, name: `${student.firstName} ${student.lastName ?? ""}`.trim() }))}
      canManageInvitations={canManageInvitations}
    /> : <>
      <section className="mt-8" aria-labelledby="students-heading">
        <h2 id="students-heading" className="text-xl font-semibold">Students</h2>
        <div className="mt-3 grid gap-3">
          {students.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-surface p-6"><p className="text-secondary">No students have been added to this family.</p><Link href={`/family/${family.id}/students/new`} className="mt-3 inline-block text-sm font-medium text-primary underline">Add the first student</Link></div> : students.map((student) => <Link key={student.id} href={`/family/${family.id}/students/${student.id}`} className="card card-interactive shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><h3 className="font-medium text-content">{student.firstName} {student.lastName ?? ""}</h3><p className="mt-1 text-sm text-secondary">{student.desiredDegree ?? "Degree not set"} · {student.preferredIntake ?? "Intake not set"}</p></div><span className="text-sm text-secondary">View <span aria-hidden="true">→</span></span></div>
          </Link>)}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="finances-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="finances-heading" className="text-xl font-semibold">Education finances</h2><Link href={`/family/${family.id}/finances`} className="text-sm font-medium text-primary underline">Edit finances</Link></div>
        <div className="mt-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          {!finances ? <p className="text-secondary">No financial information has been recorded yet. <Link href={`/family/${family.id}/finances`} className="text-primary underline">Add finances</Link></p> : <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-sm text-secondary">Education savings</dt><dd className="mt-1 font-medium">{formatInr(finances.educationSavingsInr)} <State value={finances.educationSavingsState} /></dd></div>
            <div><dt className="text-sm text-secondary">Proposed loan</dt><dd className="mt-1 font-medium">{formatInr(finances.proposedLoanInr)} <State value={finances.proposedLoanState} /></dd></div>
            <div><dt className="text-sm text-secondary">Annual household income</dt><dd className="mt-1 font-medium">{formatInr(finances.annualHouseholdIncomeInr)} <State value={finances.annualHouseholdIncomeState} /></dd></div>
            <div><dt className="text-sm text-secondary">Legacy annual budget</dt><dd className="mt-1 font-medium">{formatLegacyBudget(finances.annualBudgetMinor, finances.annualBudgetCurrency)} <State value={finances.annualBudgetState} /></dd></div>
            <div><dt className="text-sm text-secondary">Funding source</dt><dd className="mt-1 font-medium">{finances.fundingSource ?? "Not provided"} <State value={finances.fundingSourceState} /></dd></div>
            <div><dt className="text-sm text-secondary">Financial aid</dt><dd className="mt-1 font-medium">{finances.financialAidNeeded === null ? "Not provided" : finances.financialAidNeeded ? "Needed" : "Not needed"} <State value={finances.financialAidState} /></dd></div>
          </dl>}
        </div>
      </section>
    </>}
  </main>;
}
