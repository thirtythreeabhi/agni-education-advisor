import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { consultations } from "@/db/schema";
import { signOut } from "@/auth";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function ConsultationsPage() {
  await requireAdmin();
  const rows = await getDb().select().from(consultations).orderBy(desc(consultations.createdAt)).limit(100);
  return <main className="shell"><div style={{display:"flex", justifyContent:"space-between"}}><p className="muted">Agni Education Advisor · Admin review</p><form action={logout}><button type="submit">Log out</button></form></div><h1>Consultations</h1><p className="muted">Unassociated consultations require an explicit student association. Associated calls remain auditable.</p><section className="grid">{rows.length === 0 ? <div className="card">No consultations have been received.</div> : rows.map((row) => <Link className="card" href={`/consultations/${row.id}`} key={row.id}><strong>{row.agniSessionId}</strong><p className="muted">{row.createdAt.toLocaleString()} · {row.processingStatus} · {row.associationStatus}</p></Link>)}</section></main>;
}
