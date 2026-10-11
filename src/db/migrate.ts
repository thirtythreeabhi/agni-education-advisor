import { loadEnvironment } from "../config/load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "./client";

loadEnvironment();

async function main() {
  try {
    await migrate(getDb(), { migrationsFolder: "./drizzle" });
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
