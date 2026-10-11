import { config } from "dotenv";

/** Local development overrides .env; production should use the platform environment. */
export function loadEnvironment() {
  config({ path: ".env" });
  config({ path: ".env.local", override: true });
}
