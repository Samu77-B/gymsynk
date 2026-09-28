import { put } from "@vercel/blob";

import {
  fileToDataUrl,
  isGuideMediaUrl,
  MAX_INLINE_MEDIA_BYTES,
  mediaKindFor,
  type GuideMediaKind,
} from "@/lib/guide-media";

export type GuideMediaResult =
  | { provided: false }
  | { provided: true; mediaUrl: string; mediaType: GuideMediaKind }
  | { provided: true; error: string };

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

export async function resolveGuideMediaFromForm(
  formData: FormData,
  tenantId: string,
): Promise<GuideMediaResult> {
  const postedUrl = formData.get("mediaUrl");
  const postedType = formData.get("mediaType");

  if (typeof postedUrl === "string" && postedUrl.trim()) {
    const kind =
      postedType === "image" || postedType === "video" ? postedType : null;

    if (!isGuideMediaUrl(postedUrl) || !kind) {
      return { provided: true, error: "That photo or video could not be used." };
    }

    return {
      provided: true,
      mediaUrl: postedUrl.trim(),
      mediaType: kind,
    };
  }

  const fileValue = formData.get("media");

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { provided: false };
  }

  const kindFromFile = mediaKindFor(fileValue.type);

  if (!kindFromFile) {
    return {
      provided: true,
      error: "Use a JPG, PNG, WebP, GIF, MP4, or WebM file.",
    };
  }

  try {
    return {
      provided: true,
      mediaUrl: await storeUploadedFile(fileValue, tenantId),
      mediaType: kindFromFile,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";

    if (code === "too-large") {
      return {
        provided: true,
        error: "Keep photos under 1.5 MB, or videos under 50 MB.",
      };
    }

    if (code === "video-needs-storage") {
      return {
        provided: true,
        error:
          "Videos need file storage. Photos still save if they are under 1.5 MB.",
      };
    }

    console.error("Guide media save failed:", error);
    return { provided: true, error: "Could not save that photo or video." };
  }
}
