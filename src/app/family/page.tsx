import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { listFamiliesForOwner } from "@/modules/families/queries";

async function logout() { "use server"; await signOut({ redirectTo: "/login" }); }

export default async function FamilyDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const families = await listFamiliesForOwner(session.user.id);
  return <main className="mx-auto max-w-5xl px-6 py-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-slate-500">Agni Education Advisor</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Family dashboard</h1><p className="mt-2 text-slate-600">Private student profiles and education planning.</p></div><form action={logout}><button type="submit">Log out</button></form></header><div className="mt-8 flex justify-end"><Link href="/family/new" className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Create family</Link></div><section className="mt-4 grid gap-4">{families.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="text-lg font-medium">No families yet</h2><p className="mt-2 text-slate-600">Create a family to add and manage student profiles.</p><Link href="/family/new" className="mt-5 inline-block text-sm font-medium underline">Create your first family</Link></div> : families.map((family) => <Link key={family.id} href={`/family/${family.id}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{family.name}</h2><p className="mt-1 text-sm text-slate-500">{family.students.length} {family.students.length === 1 ? "student" : "students"}</p></div><span className="text-sm text-slate-500">Open →</span></div></Link>)}</section></main>;
}
