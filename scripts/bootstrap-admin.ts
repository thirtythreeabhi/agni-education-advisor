import { loadEnvironment } from "../src/config/load-env";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "../src/db/client";
import { users } from "../src/db/schema";
import { normalizeIdentifier } from "../src/lib/identifiers";
import { hashPassword } from "../src/lib/passwords";

loadEnvironment();
const bootstrapIdentifier = process.env.BOOTSTRAP_ADMIN_IDENTIFIER;
const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!process.env.ADMIN_BOOTSTRAP_SECRET || !bootstrapIdentifier || !bootstrapPassword) throw new Error("ADMIN_BOOTSTRAP_SECRET, BOOTSTRAP_ADMIN_IDENTIFIER, and BOOTSTRAP_ADMIN_PASSWORD are required");
const identifier = normalizeIdentifier(bootstrapIdentifier);
if (!identifier || bootstrapPassword.length < 12) throw new Error("Invalid admin identifier or password");
const [existing] = await getDb().select({ id: users.id }).from(users).where(eq(identifier.type === "email" ? users.email : users.phone, identifier.value)).limit(1);
if (existing) throw new Error("An account already exists for that identifier");
await getDb().insert(users).values({
  email: identifier.type === "email" ? identifier.value : null,
  phone: identifier.type === "phone" ? identifier.value : null,
  passwordHash: await hashPassword(bootstrapPassword),
  role: "admin",
});
console.log("Admin account provisioned");
await closeDb();
