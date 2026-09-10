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
import { buildTenantEmbedUrls } from "@/lib/tenant-website";

const optionalUrl = z
  .union([z.string().url().max(2048), z.literal(""), z.null()])
  .optional();

const websiteSchema = z.object({
  websiteUrl: optionalUrl,
  externalBookUrl: optionalUrl,
});

function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

function normalizeOptionalUrl(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

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
      slug: true,
      websiteUrl: true,
      externalBookUrl: true,
    },
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  const base = appUrl();
  const embed = buildTenantEmbedUrls(base, tenant.slug);

  return NextResponse.json({
    website: {
      websiteUrl: tenant.websiteUrl,
      externalBookUrl: tenant.externalBookUrl,
    },
    embed,
    corsHint:
      "Add your website domain to PUBLIC_SCHEDULE_CORS_ORIGINS if you use the JavaScript embed.",
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

  const body = await request.json();
  const parsed = parseJson(websiteSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const updates: Partial<typeof tenants.$inferInsert> = {};
  const websiteUrl = normalizeOptionalUrl(parsed.data.websiteUrl);
  const externalBookUrl = normalizeOptionalUrl(parsed.data.externalBookUrl);

  if (websiteUrl !== undefined) {
    updates.websiteUrl = websiteUrl;
  }

  if (externalBookUrl !== undefined) {
    updates.externalBookUrl = externalBookUrl;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No website changes provided");
  }

  const [updated] = await getDb()
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, session.tenantId))
    .returning({
      slug: tenants.slug,
      websiteUrl: tenants.websiteUrl,
      externalBookUrl: tenants.externalBookUrl,
    });

  const embed = buildTenantEmbedUrls(appUrl(), updated.slug);

  return NextResponse.json({
    website: {
      websiteUrl: updated.websiteUrl,
      externalBookUrl: updated.externalBookUrl,
    },
    embed,
  });
}
