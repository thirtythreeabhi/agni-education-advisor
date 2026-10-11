import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import { getProgramDetail, getSources } from "@/modules/catalog/service";
import {
  createFeeAction,
  createIntakeAction,
  createRequirementAction,
  createRevisionAction,
  createSourceAction,
  verifyRevisionAction,
} from "../../actions";

function confirmed(revisionStatus: string) {
  return revisionStatus === "verified";
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCatalogAdmin();
  const { id } = await params;
  const [detail, sources] = await Promise.all([getProgramDetail(id), getSources()]);
  if (!detail) notFound();
  const { program, revisions, intakes, requirements, fees } = detail;
  return <main className="shell"><Link href={`/admin/catalog/institutions/${program.institutionId}`} className="muted">← {program.institutionName}</Link><h1>{program.stableKey}</h1><p className="muted">{program.degreeLevel} · {program.discipline}{program.specialization ? ` · ${program.specialization}` : ""}</p>
    <section className="card"><h2>Program revisions</h2>{revisions.length === 0 ? <p>No source-backed academic-year revision yet. Do not treat this program as having current requirements or costs.</p> : <div className="grid">{revisions.map((revision) => { const isConfirmed = confirmed(revision.verificationStatus); const revisionIntakes = intakes.filter((item) => item.revisionId === revision.id); const revisionRequirements = requirements.filter((item) => item.revisionId === revision.id); const revisionFees = fees.filter((item) => item.revisionId === revision.id); return <article className="card" key={revision.id}><div style={{display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline"}}><h3>{revision.programTitle} · {revision.academicYear}</h3><span className="pill">{revision.verificationStatus}</span></div><p className="muted">Source: <a href={revision.sourceUrl} target="_blank" rel="noreferrer">{revision.sourcePublisher}</a> · retrieved {formatDate(revision.retrievedAt)}{revision.verifiedAt ? ` · verified ${formatDate(revision.verifiedAt)}` : ""}</p><form action={verifyRevisionAction} style={{display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap"}}><input type="hidden" name="programId" value={program.id} /><input type="hidden" name="revisionId" value={revision.id} /><label>Verification status<select name="verificationStatus" defaultValue={revision.verificationStatus}><option value="unverified">Unverified</option><option value="in_review">In review</option><option value="verified">Verified</option><option value="conflicting">Conflicting</option><option value="stale">Stale</option></select></label><button type="submit">Save status</button></form>
      <h4>Admission requirements</h4>{revisionRequirements.length === 0 ? <p className="muted">No requirement supplied; do not infer one.</p> : <ul>{revisionRequirements.map((requirement) => <li key={requirement.id}>{isConfirmed ? requirement.description : <><strong>Not confirmed:</strong> {requirement.description}</>}</li>)}</ul>}
      <h4>Intakes and deadlines</h4>{revisionIntakes.length === 0 ? <p className="muted">No intake supplied; do not infer a deadline.</p> : <ul>{revisionIntakes.map((intake) => <li key={intake.id}>{intake.intakeName} · {intake.applicationDeadline && isConfirmed ? `deadline ${intake.applicationDeadline}` : "deadline not confirmed"}{intake.startsOn ? ` · starts ${intake.startsOn}` : ""}</li>)}</ul>}
      <h4>International tuition and mandatory costs</h4>{revisionFees.length === 0 ? <p className="muted">No fee supplied; do not infer a cost.</p> : <ul>{revisionFees.map((fee) => <li key={fee.id}>{isConfirmed ? `${fee.feeType === "international_tuition" ? "International tuition" : "Mandatory fee"}: ${fee.amount} ${fee.currency}${fee.description ? ` · ${fee.description}` : ""}` : <><strong>Not confirmed:</strong> {fee.feeType === "international_tuition" ? "international tuition" : "mandatory fee"}</>}</li>)}</ul>}
      </article>; })}</div>}
    </section>
    <section className="grid" style={{gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 24}}>
      <div className="card"><h2>Add revision</h2><form action={createRevisionAction} className="grid"><input type="hidden" name="programId" value={program.id} /><label>Academic year<input name="academicYear" placeholder="2026-2027" required /></label><label>Program title<input name="programTitle" required /></label><label>Evidence source<select name="sourceId" required><option value="" disabled>Select a source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.publisher} · {source.url}</option>)}</select></label><label>Retrieved on<input name="retrievedAt" type="date" required /></label><button type="submit">Add unverified revision</button></form></div>
      <div className="card"><h2>Add official source</h2><form action={createSourceAction} className="grid"><input type="hidden" name="programId" value={program.id} /><label>URL<input name="url" type="url" required /></label><label>Publisher<input name="publisher" required /></label><label>Authority<select name="authorityType" defaultValue="university"><option value="university">University</option><option value="government">Government</option><option value="accreditor">Accreditor</option><option value="exam_body">Exam body</option><option value="other_official">Other official</option></select></label><label>Retrieved on<input name="retrievedAt" type="date" required /></label><button type="submit">Add source</button></form></div>
    </section>
    {revisions.length > 0 && <section className="card" style={{marginTop: 24}}><h2>Add sourced facts</h2><p className="muted">Facts start unconfirmed and inherit the selected revision’s academic year and evidence source.</p><div className="grid" style={{gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"}}><form action={createRequirementAction} className="grid"><input type="hidden" name="programId" value={program.id} /><label>Revision<select name="revisionId" required>{revisions.map((revision) => <option value={revision.id} key={revision.id}>{revision.academicYear} · {revision.programTitle}</option>)}</select></label><label>Type<select name="requirementType"><option value="academic">Academic</option><option value="language">Language</option><option value="entrance_exam">Entrance exam</option><option value="document">Document</option><option value="other">Other</option></select></label><label>Requirement<input name="description" required /></label><button type="submit">Add requirement</button></form><form action={createIntakeAction} className="grid"><input type="hidden" name="programId" value={program.id} /><label>Revision<select name="revisionId" required>{revisions.map((revision) => <option value={revision.id} key={revision.id}>{revision.academicYear} · {revision.programTitle}</option>)}</select></label><label>Intake name<input name="intakeName" placeholder="Fall" required /></label><label>Starts on<input name="startsOn" type="date" /></label><label>Application deadline<input name="applicationDeadline" type="date" /></label><button type="submit">Add intake</button></form><form action={createFeeAction} className="grid"><input type="hidden" name="programId" value={program.id} /><label>Revision<select name="revisionId" required>{revisions.map((revision) => <option value={revision.id} key={revision.id}>{revision.academicYear} · {revision.programTitle}</option>)}</select></label><label>Fee type<select name="feeType"><option value="international_tuition">International tuition</option><option value="mandatory">Mandatory fee</option></select></label><label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label><label>Currency<input name="currency" placeholder="USD" maxLength={3} required /></label><label>Description<input name="description" /></label><label><span>Required?</span><input name="isRequired" type="checkbox" defaultChecked /></label><button type="submit">Add fee</button></form></div></section>}
  </main>;
}
