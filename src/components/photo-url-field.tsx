"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GUIDE_IMAGE_TYPES } from "@/lib/guide-media";
import { MAX_PROFILE_PHOTO_BYTES, PROFILE_PHOTO_ACCEPT } from "@/lib/profile-photo";

type PhotoUrlFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
};

export function PhotoUrlField({ id, label, value, onChange }: PhotoUrlFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const previewUrl = value || null;

  async function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setFieldError(null);

    if (!GUIDE_IMAGE_TYPES.has(file.type)) {
      setFieldError("Use a JPG, PNG, WebP, or GIF file.");
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setFieldError("Photo must be 2 MB or smaller.");
      return;
    }

    setUploading(true);

    try {
      const blob = await upload(
        `profile-photos/${crypto.randomUUID()}-${file.name}`,
        file,
        {
          access: "public",
          handleUploadUrl: "/api/profile-photos/upload",
          multipart: true,
        },
      );
      onChange(blob.url);
    } catch {
      setFieldError(
        "Could not upload that photo. Try again or paste an image URL below.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2">
          <Image
            src={previewUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-md object-cover"
            unoptimized={
              previewUrl.startsWith("blob:") || previewUrl.startsWith("data:")
            }
          />
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => onChange("")}
          >
            Remove photo
          </button>
        </div>
      ) : null}
      <Input
        id={id}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFileSelected(file);
          event.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        {uploading ? "Uploading…" : "JPG, PNG, WebP, or GIF · max 2 MB"}
      </p>
      <div className="space-y-1">
        <Label htmlFor={`${id}-url`} className="text-xs text-muted-foreground">
          Or image URL
        </Label>
        <Input
          id={`${id}-url`}
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://..."
          disabled={uploading}
        />
      </div>
      {fieldError ? (
        <p className="text-xs text-destructive">{fieldError}</p>
      ) : null}
    </div>
  );
}
