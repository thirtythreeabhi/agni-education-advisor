import { loadEnvironment } from "./src/config/load-env";
import { defineConfig } from "drizzle-kit";

loadEnvironment();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://missing:missing@localhost/missing" },
});
