import { and, desc, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
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
import {
  fileToDataUrl,
  isGuideMediaUrl,
  MAX_INLINE_MEDIA_BYTES,
  mediaKindFor,
  type GuideMediaKind,
} from "@/lib/guide-media";

const kindSchema = z.enum(["workout", "nutrition"]);
const mediaTypeSchema = z.enum(["image", "video"]);

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

  let mediaUrl: string | null = null;
  let mediaType: GuideMediaKind | null = null;

  const postedUrl = formData.get("mediaUrl");
  const postedType = mediaTypeSchema.safeParse(formData.get("mediaType"));

  if (typeof postedUrl === "string" && postedUrl.trim()) {
    if (!isGuideMediaUrl(postedUrl) || !postedType.success) {
      return jsonError("That photo or video could not be used.");
    }

    mediaUrl = postedUrl.trim();
    mediaType = postedType.data;
  } else {
    const fileValue = formData.get("media");

    if (fileValue instanceof File && fileValue.size > 0) {
      const kindFromFile = mediaKindFor(fileValue.type);

      if (!kindFromFile) {
        return jsonError("Use a JPG, PNG, WebP, GIF, MP4, or WebM file.");
      }

      mediaType = kindFromFile;

      try {
        mediaUrl = await storeUploadedFile(fileValue, session.tenantId);
      } catch (error) {
        const code = error instanceof Error ? error.message : "";

        if (code === "too-large") {
          return jsonError("Keep photos under 1.5 MB, or videos under 50 MB.");
        }

        if (code === "video-needs-storage") {
          return jsonError(
            "Videos need file storage. Photos still save if they are under 1.5 MB.",
          );
        }

        console.error("Guide media save failed:", error);
        return jsonError("Could not save that photo or video.", 500);
      }
    }
  }

  const [guide] = await getDb()
    .insert(gymGuides)
    .values({
      tenantId: session.tenantId,
      kind: kind.data,
      title: title.data,
      body: body.data,
      mediaUrl,
      mediaType,
    })
    .returning();

  return NextResponse.json({ guide }, { status: 201 });
}

async function storeUploadedFile(file: File, tenantId: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `guides/${tenantId}/${crypto.randomUUID()}-${file.name}`,
      file,
      { access: "public", addRandomSuffix: true },
    );
    return blob.url;
  }

  if (file.size > MAX_INLINE_MEDIA_BYTES) {
    throw new Error("too-large");
  }

  const kind = mediaKindFor(file.type);

  if (kind === "video") {
    throw new Error("video-needs-storage");
  }

  return fileToDataUrl(file);
}
