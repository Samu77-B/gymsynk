import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
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
import { isVercelBlobUrl, type GuideMediaKind } from "@/lib/guide-media";
import { resolveGuideMediaFromForm } from "@/lib/guide-media-store";

async function deleteBlobIfNeeded(url: string | null) {
  if (!url || !isVercelBlobUrl(url)) {
    return;
  }

  try {
    await del(url);
  } catch (error) {
    console.error("Could not delete guide media:", error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const existing = await getDb().query.gymGuides.findFirst({
    where: and(eq(gymGuides.id, id), eq(gymGuides.tenantId, session.tenantId)),
    columns: {
      id: true,
      title: true,
      body: true,
      mediaUrl: true,
      mediaType: true,
    },
  });

  if (!existing) {
    return jsonError("That guide was not found.", 404);
  }

  const formData = await request.formData();
  const title = z.string().trim().min(1).max(120).safeParse(formData.get("title"));
  const body = z.string().trim().min(1).max(8000).safeParse(formData.get("body"));

  if (!title.success || !body.success) {
    return jsonError("Add a title and the details.");
  }

  let mediaUrl = existing.mediaUrl;
  let mediaType = existing.mediaType as GuideMediaKind | null;
  const removeMedia = formData.get("removeMedia") === "true";
  const media = await resolveGuideMediaFromForm(formData, session.tenantId);

  if (media.provided && "error" in media) {
    return jsonError(media.error);
  }

  if (media.provided) {
    if (existing.mediaUrl && existing.mediaUrl !== media.mediaUrl) {
      await deleteBlobIfNeeded(existing.mediaUrl);
    }
    mediaUrl = media.mediaUrl;
    mediaType = media.mediaType;
  } else if (removeMedia) {
    await deleteBlobIfNeeded(existing.mediaUrl);
    mediaUrl = null;
    mediaType = null;
  }

  const [guide] = await getDb()
    .update(gymGuides)
    .set({
      title: title.data,
      body: body.data,
      mediaUrl,
      mediaType,
    })
    .where(and(eq(gymGuides.id, id), eq(gymGuides.tenantId, session.tenantId)))
    .returning();

  return NextResponse.json({ guide });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;

  const [removed] = await getDb()
    .delete(gymGuides)
    .where(and(eq(gymGuides.id, id), eq(gymGuides.tenantId, session.tenantId)))
    .returning({ id: gymGuides.id, mediaUrl: gymGuides.mediaUrl });

  if (!removed) {
    return jsonError("That guide was not found.", 404);
  }

  await deleteBlobIfNeeded(removed.mediaUrl);

  return NextResponse.json({ ok: true });
}
