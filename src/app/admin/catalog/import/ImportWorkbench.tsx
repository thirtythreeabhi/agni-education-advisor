"use client";

import { useState } from "react";

type Preview = { totalRecords: number; validRecords: unknown[]; errors: Array<{ recordIndex: number | null; path?: string; message: string }>; databaseMatches?: Array<{ recordIndex: number; institution: string; program: string; revision: string }> };
type Result = { totalRecords: number; imported: number; skipped: number; errors: Array<{ recordIndex: number | null; path?: string; message: string }> };

export default function ImportWorkbench() {
  const [document, setDocument] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function previewImport() {
    setBusy(true); setError(null); setResult(null);
    try { const response = await fetch("/api/admin/catalog/import/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ document }) }); const payload = await response.json(); if (!response.ok) setError(payload.error ?? "Preview failed"); else setPreview(payload); } catch { setError("Unable to reach the preview service. Try again."); } finally { setBusy(false); }
  }

  async function executeImport() {
    setBusy(true); setError(null);
    try { const response = await fetch("/api/admin/catalog/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ document, dryRun: false }) }); const payload = await response.json(); if (!response.ok) setError(payload.error ?? "Import failed"); else setResult(payload); } catch { setError("Unable to reach the import service. Try again."); } finally { setBusy(false); }
  }

  return <div className="grid"><div className="card"><h2>JSON document</h2><p className="muted">Paste a version 1 document from <code>src/modules/catalog/import-format.md</code>. URLs are recorded as evidence; they are never fetched.</p><textarea value={document} onChange={(event) => { setDocument(event.target.value); setPreview(null); setResult(null); }} rows={20} style={{width: "100%", fontFamily: "monospace"}} placeholder='{"version":1,"records":[]}' /><div style={{display: "flex", gap: 8, marginTop: 12}}><button type="button" onClick={previewImport} disabled={busy || !document}>Preview / dry-run</button><button type="button" onClick={executeImport} disabled={busy || !preview || preview.errors.length > 0 || preview.validRecords.length === 0}>Import reviewed preview</button></div></div>
    {error && <div className="card"><strong>Error</strong><p>{error}</p></div>}
    {preview && <div className="card"><h2>Preview</h2><p>{preview.validRecords.length} valid of {preview.totalRecords} records. Existing keys are preserved; imported revisions will be unverified.</p>{preview.databaseMatches && <ul>{preview.databaseMatches.map((match) => <li key={match.recordIndex}>Record {match.recordIndex}: institution {match.institution}, program {match.program}, revision {match.revision}</li>)}</ul>}{preview.errors.length > 0 && <div><h3>Errors</h3><ul>{preview.errors.map((item, index) => <li key={index}>Record {item.recordIndex ?? "document"}{item.path ? ` · ${item.path}` : ""}: {item.message}</li>)}</ul></div>}</div>}
    {result && <div className="card"><h2>Import result</h2><p>{result.imported} records changed, {result.skipped} already present. No existing facts were overwritten.</p>{result.errors.length > 0 && <ul>{result.errors.map((item, index) => <li key={index}>Record {item.recordIndex ?? "document"}: {item.message}</li>)}</ul>}</div>}
  </div>;
}
