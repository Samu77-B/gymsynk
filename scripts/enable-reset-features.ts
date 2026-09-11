import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const sql = neon(connectionString);

  await sql`
    UPDATE tenants
    SET
      feature_memberships = true,
      feature_class_booking = true,
      feature_session_packs = true
    WHERE slug = 'reset'
  `;

  console.log("Reset: all features enabled (memberships, class booking, group training).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
