import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { gymGuides } from "@/db/schema";
import { jsonError } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { isVercelBlobUrl } from "@/lib/guide-media";

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

  if (removed.mediaUrl && isVercelBlobUrl(removed.mediaUrl)) {
    try {
      await del(removed.mediaUrl);
    } catch (error) {
      console.error("Could not delete guide media:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
