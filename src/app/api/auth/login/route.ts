import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  tenantSlug: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseJson(loginSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const { email, tenantSlug } = parsed.data;
  const db = getDb();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, tenantSlug),
  });

  if (!tenant) {
    return jsonError("Tenant not found", 404);
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenant.id), eq(users.email, email)),
  });

  if (!user) {
    return jsonError("User not found for this gym", 404);
  }

  if (!user.isActive) {
    return jsonError(
      user.role === "member"
        ? "Your membership account is paused. Contact the gym."
        : "This staff account is paused. Contact your gym manager.",
      403,
    );
  }

  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    tenantSlug: tenant.slug,
  });

  return Response.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      tenantSlug: tenant.slug,
    },
  });
}
