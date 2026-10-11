import { NextResponse } from "next/server";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import { executeCatalogImport } from "@/modules/catalog/importer";

export async function POST(request: Request) {
  await requireCatalogAdmin();
  const body = await request.json().catch(() => null) as { document?: unknown; dryRun?: unknown } | null;
  if (!body || typeof body.document !== "string") return NextResponse.json({ error: "document must be a JSON string" }, { status: 400 });
  if (body.document.length > 1_000_000) return NextResponse.json({ error: "document exceeds the 1 MB limit" }, { status: 413 });
  if (body.dryRun === true) return NextResponse.json(await executeCatalogImportPreview(body.document));
  return NextResponse.json(await executeCatalogImport(body.document));
}

async function executeCatalogImportPreview(document: string) {
  const { previewCatalogImportAgainstDatabase } = await import("@/modules/catalog/importer");
  return previewCatalogImportAgainstDatabase(document);
}
