import Link from "next/link";
import { requireCatalogAdmin } from "@/modules/catalog/admin-gate";
import ImportWorkbench from "./ImportWorkbench";

export default async function CatalogImportPage() {
  await requireCatalogAdmin();
  return <main className="shell"><Link href="/admin/catalog" className="muted">← Catalog</Link><h1>Import catalog data</h1><p className="muted">Preview is required in this interface before execution. Every imported revision starts unverified and must pass the readiness check after explicit review.</p><ImportWorkbench /></main>;
}
