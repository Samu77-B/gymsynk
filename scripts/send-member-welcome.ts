import { config } from "dotenv";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import { tenants, users } from "../src/db/schema";
import { sendMemberWelcomeEmail } from "../src/lib/email";

config({ path: ".env.local" });

async function main() {
  const tenantSlug = process.argv[2]?.trim() || "reset";
  const memberEmailArg = process.argv[3]?.trim().toLowerCase();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const db = drizzle(neon(connectionString), { schema });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  });

  if (!tenant) {
    throw new Error(`Tenant "${tenantSlug}" not found.`);
  }

  let member;

  if (memberEmailArg) {
    member = await db.query.users.findFirst({
      where: and(
        eq(users.tenantId, tenant.id),
        eq(users.email, memberEmailArg),
        eq(users.role, "member"),
      ),
    });

    if (!member) {
      throw new Error(
        `Member ${memberEmailArg} not found on ${tenant.name}.`,
      );
    }
  } else {
    const latestMembers = await db.query.users.findMany({
      where: and(eq(users.tenantId, tenant.id), eq(users.role, "member")),
      orderBy: [desc(users.createdAt)],
      limit: 1,
    });
    member = latestMembers[0];

    if (!member) {
      throw new Error(`No members found on ${tenant.name}.`);
    }
  }

  const result = await sendMemberWelcomeEmail({
    to: member.email,
    memberName: member.fullName,
    gymName: tenant.name,
    tenantSlug: tenant.slug,
    primaryColor: tenant.primaryColor,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  console.log(`Welcome email sent to ${member.fullName} <${member.email}>.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
