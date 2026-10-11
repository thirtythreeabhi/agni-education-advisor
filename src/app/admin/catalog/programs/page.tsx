import Link from "next/link";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import { listInstitutions, listPrograms } from "@/modules/catalog/service";

export default async function ProgramsPage() {
  await requireCatalogAdmin();
  const [programs, institutions] = await Promise.all([listPrograms(), listInstitutions()]);
  return <main className="shell"><Link href="/admin/catalog" className="muted">← Catalog</Link><div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}><h1>Programs</h1><Link href="/admin/catalog/programs/new">Add program →</Link></div><section className="grid">{programs.length === 0 ? <div className="card">No programs yet.</div> : programs.map((program) => <Link className="card" href={`/admin/catalog/programs/${program.id}`} key={program.id}><strong>{program.institutionName} · {program.stableKey}</strong><p className="muted">{program.degreeLevel} · {program.discipline}{program.specialization ? ` · ${program.specialization}` : ""}</p></Link>)}</section><p className="muted">{institutions.length} institutions available for new programs.</p></main>;
}
