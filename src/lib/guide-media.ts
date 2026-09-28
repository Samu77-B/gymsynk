export const GUIDE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const GUIDE_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const GUIDE_MEDIA_ACCEPT = [
  ...GUIDE_IMAGE_TYPES,
  ...GUIDE_VIDEO_TYPES,
].join(",");

export const MAX_INLINE_MEDIA_BYTES = 1.5 * 1024 * 1024;
export const MAX_BLOB_MEDIA_BYTES = 50 * 1024 * 1024;

export type GuideMediaKind = "image" | "video";

export function mediaKindFor(mime: string): GuideMediaKind | null {
  if (GUIDE_IMAGE_TYPES.has(mime)) {
    return "image";
  }

  if (GUIDE_VIDEO_TYPES.has(mime)) {
    return "video";
  }

  return null;
}

export function isGuideMediaUrl(value: string) {
  if (value.startsWith("data:image/") || value.startsWith("data:video/")) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export function isVercelBlobUrl(value: string) {
  try {
    return new URL(value).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}
