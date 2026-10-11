import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import { getInstitution } from "@/modules/catalog/service";

export default async function InstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCatalogAdmin();
  const { id } = await params;
  const result = await getInstitution(id);
  if (!result) notFound();
  const { institution, programs, sources } = result;
  return <main className="shell"><Link href="/admin/catalog" className="muted">← Catalog</Link><h1>{institution.officialName}</h1><p className="muted">{institution.countryCode} · stable key: {institution.stableKey}</p>
    <section className="card"><h2>Official sources</h2>{sources.length === 0 ? <p>Missing source; institution is not verified.</p> : <div className="grid">{sources.map((source) => <div key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}</a><p className="muted">{source.url} · {source.verificationStatus}{source.verifiedAt ? ` · verified ${source.verifiedAt.toLocaleDateString()}` : ""}</p></div>)}</div>}</section>
    <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 28}}><h2>Programs</h2><Link href={`/admin/catalog/programs/new?institutionId=${institution.id}`}>Add program →</Link></div>
    <section className="grid">{programs.length === 0 ? <div className="card">No programs yet.</div> : programs.map((program) => <Link className="card" href={`/admin/catalog/programs/${program.id}`} key={program.id}><strong>{program.stableKey}</strong><p className="muted">{program.degreeLevel} · {program.discipline}{program.specialization ? ` · ${program.specialization}` : ""}</p></Link>)}</section>
  </main>;
}
