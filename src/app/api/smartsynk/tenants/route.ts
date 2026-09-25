import { randomBytes } from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import {
  gymPublicBaseUrl,
  isSmartSynkRequest,
  smartSynkUnauthorized,
} from "@/lib/smartsynk-admin";

const createTenantSchema = z.object({
  gymName: z.string().trim().min(1).max(255),
  ownerName: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase slug like reset-east")
    .max(100)
    .optional(),
});

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "gym";
}

function publicLinks(slug: string) {
  const base = gymPublicBaseUrl();
  return {
    loginUrl: `${base}/login?tenant=${encodeURIComponent(slug)}`,
    joinUrl: `${base}/join?tenant=${encodeURIComponent(slug)}`,
    embedUrl: `${base}/embed/${slug}/schedule`,
  };
}

export async function GET(request: Request) {
  if (!isSmartSynkRequest(request)) {
    return smartSynkUnauthorized();
  }

  const db = getDb();
  const tenantRows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      createdAt: tenants.createdAt,
    })
    .from(tenants)
    .orderBy(desc(tenants.createdAt));

  const ownerRows = await db
    .select({
      tenantId: users.tenantId,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, "owner"));

  const ownerByTenant = new Map(ownerRows.map((owner) => [owner.tenantId, owner]));

  return NextResponse.json({
    tenants: tenantRows.map((tenant) => {
      const owner = ownerByTenant.get(tenant.id);
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: tenant.createdAt,
        owner: owner
          ? { name: owner.fullName, email: owner.email }
          : null,
        ...publicLinks(tenant.slug),
      };
    }),
  });
}

export async function POST(request: Request) {
  if (!isSmartSynkRequest(request)) {
    return smartSynkUnauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const parsed = parseJson(createTenantSchema, body);
  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  const requestedSlug = parsed.data.slug;
  let slug = requestedSlug ?? slugify(parsed.data.gymName);

  if (!requestedSlug) {
    const base = slug;
    let suffix = 2;
    while (
      await db.query.tenants.findFirst({
        where: eq(tenants.slug, slug),
        columns: { id: true },
      })
    ) {
      slug = `${base}-${suffix}`;
      suffix += 1;
      if (suffix > 50) {
        return jsonError("Could not allocate a unique slug", 409);
      }
    }
  } else {
    const taken = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
      columns: { id: true },
    });
    if (taken) {
      return jsonError(`Slug “${slug}” is already in use`, 409);
    }
  }

  const generatedPassword = parsed.data.password
    ? null
    : randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(parsed.data.password ?? generatedPassword!);

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: parsed.data.gymName,
      slug,
    })
    .returning({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      createdAt: tenants.createdAt,
    });

  await db.insert(users).values({
    tenantId: tenant.id,
    fullName: parsed.data.ownerName,
    email,
    role: "owner",
    passwordHash,
  });

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
      owner: { name: parsed.data.ownerName, email },
      ...publicLinks(tenant.slug),
    },
    temporaryPassword: generatedPassword,
  });
}
