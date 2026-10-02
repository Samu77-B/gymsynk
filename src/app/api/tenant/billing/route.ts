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
import {
  BILLING_MODEL_LABELS,
  CREDIT_ROLLOVER_LABELS,
  featureFlagsForBillingModel,
  resolveBillingModel,
  type BillingModel,
} from "@/lib/tenant-billing";
import { resolveTenantFeatures } from "@/lib/tenant-features";

const billingSchema = z
  .object({
    billingModel: z
      .enum(["credits_only", "membership_only", "hybrid"])
      .optional(),
    creditRollover: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.billingModel !== undefined || data.creditRollover !== undefined,
    { message: "No billing fields to update" },
  );

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
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  const billingModel = resolveBillingModel(tenant);

  return NextResponse.json({
    billingModel,
    creditRollover: tenant.creditRollover,
    labels: BILLING_MODEL_LABELS,
    creditRolloverLabels: CREDIT_ROLLOVER_LABELS,
    features: resolveTenantFeatures(tenant),
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const parsed = parseJson(billingSchema, await request.json());

  if (!parsed.success) {
    return parsed.response;
  }

  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenants.id, session.tenantId),
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  const model = (parsed.data.billingModel ??
    resolveBillingModel(tenant)) as BillingModel;
  const flags = featureFlagsForBillingModel(model);
  const creditRollover = parsed.data.creditRollover ?? tenant.creditRollover;

  const [updated] = await getDb()
    .update(tenants)
    .set({
      billingModel: model,
      creditRollover,
      featureMemberships: flags.featureMemberships,
      featureSessionPacks: flags.featureSessionPacks,
    })
    .where(eq(tenants.id, session.tenantId))
    .returning();

  return NextResponse.json({
    billingModel: resolveBillingModel(updated),
    creditRollover: updated.creditRollover,
    features: resolveTenantFeatures(updated),
  });
}
