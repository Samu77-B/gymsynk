import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import { tenants, users } from "../src/db/schema";
import { hashPassword, resolveSeedStaffPassword } from "../src/lib/password";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const passwordHash = await hashPassword(resolveSeedStaffPassword());
  const db = drizzle(neon(connectionString), { schema });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "demo-gym"),
  });

  if (!tenant) {
    throw new Error("Demo gym not found.");
  }

  const updated = await db
    .update(users)
    .set({ passwordHash })
    .where(
      and(
        eq(users.tenantId, tenant.id),
        inArray(users.role, ["owner", "admin", "trainer"]),
      ),
    )
    .returning({ email: users.email, role: users.role });

  if (updated.length === 0) {
    console.log("No Demo Gym staff accounts found.");
    return;
  }

  console.log("Demo Gym staff passwords set for:");
  for (const row of updated) {
    console.log(`  ${row.role}: ${row.email}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
