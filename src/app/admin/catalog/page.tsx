import Link from "next/link";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import { listInstitutions, listPrograms } from "@/modules/catalog/service";
import { createInstitutionAction } from "./actions";

export default async function CatalogHomePage() {
  await requireCatalogAdmin();
  const [institutions, programs] = await Promise.all([listInstitutions(), listPrograms()]);
  return <main className="shell">
    <p className="muted"><Link href="/consultations">Consultations</Link> · <Link href="/">Agni Education Advisor</Link> · Admin catalog</p>
    <div style={{display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline"}}><h1>University catalog</h1><div style={{display: "flex", gap: 12}}><Link href="/admin/catalog/import">Import JSON</Link><Link href="/admin/catalog/programs">All programs →</Link></div></div>
    <p className="muted">Only source-backed catalog records belong here. Unverified data is labelled and is not a confirmed recommendation fact.</p>
    <section className="grid" style={{gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 24}}>
      <div className="card"><h2>Add institution</h2><p className="muted">The first official source is required when creating an institution.</p><form action={createInstitutionAction} className="grid">
        <label>Official name<input name="officialName" required /></label>
        <label>Stable key<input name="stableKey" placeholder="example-university" required /></label>
        <label>Country code<input name="countryCode" placeholder="IN" maxLength={2} required /></label>
        <label>Official source URL<input name="sourceUrl" type="url" required /></label>
        <label>Source publisher<input name="sourcePublisher" required /></label>
        <label>Authority<select name="authorityType" defaultValue="university"><option value="university">University</option><option value="government">Government</option><option value="accreditor">Accreditor</option><option value="exam_body">Exam body</option><option value="other_official">Other official</option></select></label>
        <label>Retrieved on<input name="sourceRetrievedAt" type="date" required /></label>
        <button type="submit">Create institution</button>
      </form></div>
      <div className="card"><h2>Catalog totals</h2><p><strong>{institutions.length}</strong> institutions</p><p><strong>{programs.length}</strong> programs</p><p className="muted">Records are not recommendations until evidence is reviewed.</p></div>
    </section>
    <h2>Institutions</h2>
    <section className="grid">{institutions.length === 0 ? <div className="card">No institutions yet.</div> : institutions.map((institution) => <Link className="card" href={`/admin/catalog/institutions/${institution.id}`} key={institution.id}><strong>{institution.officialName}</strong><p className="muted">{institution.countryCode} · {institution.stableKey}</p></Link>)}</section>
  </main>;
}
