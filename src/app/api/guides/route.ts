import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { gymGuides } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";

const kindSchema = z.enum(["workout", "nutrition"]);

const createSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(8000),
});

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const kind = kindSchema.safeParse(
    new URL(request.url).searchParams.get("kind"),
  );

  if (!kind.success) {
    return jsonError("Choose workout or nutrition.", 400);
  }

  const guides = await getDb().query.gymGuides.findMany({
    where: and(
      eq(gymGuides.tenantId, session.tenantId),
      eq(gymGuides.kind, kind.data),
    ),
    orderBy: [desc(gymGuides.createdAt)],
    columns: {
      id: true,
      kind: true,
      title: true,
      body: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ guides });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const parsed = parseJson(createSchema, await request.json());

  if (!parsed.success) {
    return parsed.response;
  }

  const [guide] = await getDb()
    .insert(gymGuides)
    .values({
      tenantId: session.tenantId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .returning();

  return NextResponse.json({ guide }, { status: 201 });
}
