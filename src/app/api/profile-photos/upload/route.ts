import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { GUIDE_IMAGE_TYPES } from "@/lib/guide-media";
import { MAX_PROFILE_PHOTO_BYTES } from "@/lib/profile-photo";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return jsonError("File storage is not connected yet.", 503);
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...GUIDE_IMAGE_TYPES],
        maximumSizeInBytes: MAX_PROFILE_PHOTO_BYTES,
        addRandomSuffix: true,
      }),
    });

    return NextResponse.json(json);
  } catch (error) {
    console.error("Profile photo upload failed:", error);
    return jsonError("Could not start that upload.", 400);
  }
}
