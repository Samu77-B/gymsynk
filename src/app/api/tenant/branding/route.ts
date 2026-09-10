import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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
  logoUrl: z.string().url().nullable().optional(),
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

  if (logoUrl) {
    try {
      new URL(logoUrl);
    } catch {
      return jsonError("Logo URL is not valid");
    }
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

    if (logoFile.size > 2 * 1024 * 1024) {
      return jsonError("Logo must be 2 MB or smaller");
    }

    const extension =
      logoFile.type === "image/png"
        ? "png"
        : logoFile.type === "image/jpeg"
          ? "jpg"
          : logoFile.type === "image/webp"
            ? "webp"
            : "svg";

    const directory = path.join(process.cwd(), "public", "tenant-logos");
    await mkdir(directory, { recursive: true });

    const filename = `${tenant.slug}.${extension}`;
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    await writeFile(path.join(directory, filename), buffer);

    logoUrl = `/tenant-logos/${filename}?v=${Date.now()}`;
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
}
