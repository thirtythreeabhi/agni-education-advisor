import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { consultations, consultationExtractions } from "@/db/schema";

export default async function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = getDb();
  const [consultation] = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  if (!consultation) notFound();
  const extractions = await db.select().from(consultationExtractions).where(eq(consultationExtractions.consultationId, id));
  return <main className="shell"><Link href="/consultations" className="muted">← All consultations</Link><h1>Consultation</h1><div className="card"><p><strong>Agni session:</strong> {consultation.agniSessionId}</p><p><strong>Status:</strong> {consultation.agniStatus ?? "Not supplied"}</p><p><strong>Agent:</strong> {consultation.agentId ?? "Not supplied"}</p><p><strong>Duration:</strong> {consultation.durationSec ?? "Not supplied"} seconds</p><p><strong>Disconnect reason:</strong> {consultation.disconnectReason ?? "Not supplied"}</p><p><strong>Processing:</strong> {consultation.processingStatus}</p><p><strong>Association:</strong> {consultation.associationStatus} (no automatic student association)</p></div><h2>Extracted profile</h2><div className="grid">{extractions.length === 0 ? <div className="card">No extracted fields were supplied.</div> : extractions.map((field) => <div className="card" key={field.id}><div style={{display:"flex", justifyContent:"space-between", gap: 12}}><strong>{field.fieldName}</strong><span className={`pill pill-${field.state}`}>{field.state}</span></div><p><strong>Value:</strong> {field.normalizedValue === null ? "Not confirmed" : String(field.normalizedValue)}</p><p className="muted">Original value: {field.originalValue === null ? "missing" : String(field.originalValue)}</p></div>)}</div><h2>Transcript</h2><div className="card"><pre style={{whiteSpace:"pre-wrap", overflowWrap:"anywhere"}}>{consultation.transcriptions ? JSON.stringify(consultation.transcriptions, null, 2) : "No transcript supplied."}</pre><p className="muted">Transcript retention is an unresolved policy decision; access is restricted to administrators in this phase.</p></div></main>;
}
