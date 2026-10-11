import Link from "next/link";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import { listInstitutions } from "@/modules/catalog/service";
import { createProgramAction } from "../../actions";

export default async function NewProgramPage({ searchParams }: { searchParams: Promise<{ institutionId?: string }> }) {
  await requireCatalogAdmin();
  const [institutions, params] = await Promise.all([listInstitutions(), searchParams]);
  return <main className="shell"><Link href="/admin/catalog/programs" className="muted">← Programs</Link><h1>New program</h1><form action={createProgramAction} className="card grid"><label>Institution<select name="institutionId" defaultValue={params.institutionId ?? ""} required><option value="" disabled>Select an institution</option>{institutions.map((institution) => <option value={institution.id} key={institution.id}>{institution.officialName}</option>)}</select></label><label>Stable key<input name="stableKey" placeholder="msc-data-science" required /></label><label>Degree level<select name="degreeLevel" defaultValue="bachelor"><option value="bachelor">Bachelor</option><option value="master">Master</option></select></label><label>Discipline<input name="discipline" required /></label><label>Specialization (optional)<input name="specialization" /></label><button type="submit">Create program</button></form></main>;
}
