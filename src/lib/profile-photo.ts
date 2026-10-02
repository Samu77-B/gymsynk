import { z } from "zod";

import { GUIDE_IMAGE_TYPES, isGuideMediaUrl } from "@/lib/guide-media";

export const PROFILE_PHOTO_ACCEPT = [...GUIDE_IMAGE_TYPES].join(",");
export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

export function isProfilePhotoUrl(value: string) {
  if (value.startsWith("data:image/")) {
    return value.length <= 2048;
  }

  if (!isGuideMediaUrl(value)) {
    return false;
  }

  return !value.startsWith("data:video/");
}

export const profilePhotoUrlSchema = z
  .union([z.string().max(2048), z.literal("")])
  .optional()
  .nullable()
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      value === "" ||
      isProfilePhotoUrl(value),
    "Use a valid image URL or upload a photo",
  )
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value ? value : null;
  });
