import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { jsonError } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  createConnectDashboardLink,
  createConnectOnboardingLink,
  getPlatformSubscriptionPriceId,
  syncConnectAccountStatus,
} from "@/lib/stripe-connect";
import { serializeStripeConnectStatus } from "@/lib/tenant-billing";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";

  const db = getDb();
  let tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, session.tenantId),
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  if (refresh && tenant.stripeConnectAccountId) {
    await syncConnectAccountStatus(tenant.stripeConnectAccountId);
    tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, session.tenantId),
    });
  }

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  return NextResponse.json({
    connect: serializeStripeConnectStatus(tenant),
    platformPriceConfigured: Boolean(getPlatformSubscriptionPriceId()),
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (session.role !== "owner" && session.role !== "admin") {
    return forbiddenResponse();
  }

  const body = (await request.json()) as { action?: string };

  try {
    if (body.action === "connect_onboarding") {
      const url = await createConnectOnboardingLink(session.tenantId);
      return NextResponse.json({ url });
    }

    if (body.action === "connect_dashboard") {
      const url = await createConnectDashboardLink(session.tenantId);
      return NextResponse.json({ url });
    }

    if (body.action === "connect_refresh") {
      const tenant = await getDb().query.tenants.findFirst({
        where: eq(tenants.id, session.tenantId),
      });

      if (tenant?.stripeConnectAccountId) {
        await syncConnectAccountStatus(tenant.stripeConnectAccountId);
      }

      return NextResponse.json({ ok: true });
    }

    return jsonError("Unknown action", 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe request failed";
    return jsonError(message, 500);
  }
}
