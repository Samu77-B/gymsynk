import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/api";

const brandingSchema = z.object({
  logoUrl: z.string().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex colour like #E60000")
    .optional(),
});

const allowedImageTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const maxLogoBytes = 750 * 1024;

function isValidLogoReference(value: string) {
  if (value.startsWith("data:image/")) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
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
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
    },
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  return NextResponse.json({ branding: tenant });
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return unauthorizedResponse();
    }

    if (!canManageStaff(session.role)) {
      return forbiddenResponse();
    }

    const contentType = request.headers.get("content-type") ?? "";
    let logoUrl: string | null | undefined;
    let primaryColor: string | undefined;
    let logoFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const colorValue = formData.get("primaryColor");

      if (typeof colorValue === "string" && colorValue.length > 0) {
        primaryColor = colorValue;
      }

      const urlValue = formData.get("logoUrl");
      if (typeof urlValue === "string") {
        logoUrl = urlValue.trim() === "" ? null : urlValue.trim();
      }

      const fileValue = formData.get("logo");
      if (fileValue instanceof File && fileValue.size > 0) {
        logoFile = fileValue;
      }
    } else {
      const body = await request.json();
      const parsed = parseJson(brandingSchema, body);

      if (!parsed.success) {
        return parsed.response;
      }

      logoUrl = parsed.data.logoUrl;
      primaryColor = parsed.data.primaryColor;
    }

    if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      return jsonError("Use a hex colour like #E60000");
    }

    if (logoUrl && !isValidLogoReference(logoUrl)) {
      return jsonError("Logo URL is not valid");
    }

    const tenant = await getDb().query.tenants.findFirst({
      where: eq(tenants.id, session.tenantId),
      columns: { id: true, slug: true },
    });

    if (!tenant) {
      return jsonError("Gym not found", 404);
    }

    if (logoFile) {
      if (!allowedImageTypes.has(logoFile.type)) {
        return jsonError("Logo must be PNG, JPG, WebP, or SVG");
      }

      if (logoFile.size > maxLogoBytes) {
        return jsonError("Logo must be 750 KB or smaller");
      }

      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const base64 = buffer.toString("base64");
      logoUrl = `data:${logoFile.type};base64,${base64}`;
    }

    const updates: Partial<typeof tenants.$inferInsert> = {};

    if (logoUrl !== undefined) {
      updates.logoUrl = logoUrl;
    }

    if (primaryColor !== undefined) {
      updates.primaryColor = primaryColor;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No branding changes provided");
    }

    const [updated] = await getDb()
      .update(tenants)
      .set(updates)
      .where(eq(tenants.id, tenant.id))
      .returning();

    return NextResponse.json({ branding: updated });
  } catch (error) {
    console.error("Failed to save tenant branding:", error);
    return jsonError("Could not save branding. Try a smaller logo or use a URL.", 500);
  }
}
