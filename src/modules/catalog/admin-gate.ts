import { requireAdmin } from "@/lib/auth";

/** Every catalog page/action goes through the existing Auth.js admin gate. */
export async function requireCatalogAdmin() {
  return requireAdmin();
}
