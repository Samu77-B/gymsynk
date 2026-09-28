import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { gymGuides } from "@/db/schema";
import { jsonError } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { resolveGuideMediaFromForm } from "@/lib/guide-media-store";

const kindSchema = z.enum(["workout", "nutrition"]);

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
      mediaUrl: true,
      mediaType: true,
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

  const formData = await request.formData();
  const kind = kindSchema.safeParse(formData.get("kind"));
  const title = z.string().trim().min(1).max(120).safeParse(formData.get("title"));
  const body = z.string().trim().min(1).max(8000).safeParse(formData.get("body"));

  if (!kind.success || !title.success || !body.success) {
    return jsonError("Add a title and the details.");
  }

  const media = await resolveGuideMediaFromForm(formData, session.tenantId);

  if (media.provided && "error" in media) {
    return jsonError(media.error);
  }

  const [guide] = await getDb()
    .insert(gymGuides)
    .values({
      tenantId: session.tenantId,
      kind: kind.data,
      title: title.data,
      body: body.data,
      mediaUrl: media.provided ? media.mediaUrl : null,
      mediaType: media.provided ? media.mediaType : null,
    })
    .returning();

  return NextResponse.json({ guide }, { status: 201 });
}
