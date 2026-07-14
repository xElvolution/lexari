import { config } from "dotenv";

// Load .env.local first (Next.js does this automatically; plain tsx does not),
// then fall back to .env for anything unset.
config({ path: ".env.local" });
config();
