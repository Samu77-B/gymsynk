import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import { classes, tenants } from "../src/db/schema";
import { seedResetGroupTraining } from "../src/lib/reset-group-training";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const db = drizzle(neon(connectionString), { schema });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "reset"),
  });

  if (!tenant) {
    throw new Error("Reset tenant not found. Run npm run db:seed-reset first.");
  }

  const classRows = await db.query.classes.findMany({
    where: eq(classes.tenantId, tenant.id),
  });

  const classIdByTitle = new Map(classRows.map((row) => [row.title, row.id]));
  const result = await seedResetGroupTraining(tenant.id, classIdByTitle);

  if (result.skipped) {
    console.log("Reset group training tiers already exist. Skipping.");
    return;
  }

  console.log("Reset group training tiers seeded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
