import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { resolveTenantFeatures } from "@/lib/tenant-features";

const featuresSchema = z.object({
  memberships: z.boolean().optional(),
  classBooking: z.boolean().optional(),
  sessionPacks: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenants.id, session.tenantId),
    columns: {
      featureMemberships: true,
      featureClassBooking: true,
      featureSessionPacks: true,
    },
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  return NextResponse.json({ features: resolveTenantFeatures(tenant) });
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const parsed = parseJson(featuresSchema, await request.json());

  if (!parsed.success) {
    return parsed.response;
  }

  const updates: Partial<typeof tenants.$inferInsert> = {};

  if (parsed.data.memberships !== undefined) {
    updates.featureMemberships = parsed.data.memberships;
  }

  if (parsed.data.classBooking !== undefined) {
    updates.featureClassBooking = parsed.data.classBooking;
  }

  if (parsed.data.sessionPacks !== undefined) {
    updates.featureSessionPacks = parsed.data.sessionPacks;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No feature changes provided");
  }

  const [updated] = await getDb()
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, session.tenantId))
    .returning();

  return NextResponse.json({ features: resolveTenantFeatures(updated) });
}
