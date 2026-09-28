"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

import { GuideMedia } from "@/components/guide-media";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GUIDE_MEDIA_ACCEPT,
  MAX_BLOB_MEDIA_BYTES,
  MAX_INLINE_MEDIA_BYTES,
  mediaKindFor,
} from "@/lib/guide-media";

type GuideKind = "workout" | "nutrition";

type Guide = {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
};

const copy: Record<
  GuideKind,
  { title: string; description: string; empty: string }
> = {
  workout: {
    title: "Workouts",
    description: "Plans and session ideas members see on the Workouts tab.",
    empty: "No workout ideas yet.",
  },
  nutrition: {
    title: "Nutrition",
    description: "Meal ideas members see on the Nutrition tab.",
    empty: "No meal ideas yet.",
  },
};

const textareaClassName =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

async function attachMedia(formData: FormData, file: File | null) {
  if (!file) {
    return null;
  }

  const mediaKind = mediaKindFor(file.type);

  if (!mediaKind) {
    return "Use a JPG, PNG, WebP, GIF, MP4, or WebM file.";
  }

  if (file.size > MAX_BLOB_MEDIA_BYTES) {
    return "Keep photos and videos under 50 MB.";
  }

  try {
    const blob = await upload(
      `guides/${crypto.randomUUID()}-${file.name}`,
      file,
      {
        access: "public",
        handleUploadUrl: "/api/guides/upload",
        multipart: true,
      },
    );
    formData.set("mediaUrl", blob.url);
    formData.set("mediaType", mediaKind);
    return null;
  } catch {
    if (mediaKind === "video" || file.size > MAX_INLINE_MEDIA_BYTES) {
      return mediaKind === "video"
        ? "That video could not be uploaded. Try a shorter MP4, or a photo."
        : "That photo is too large. Keep it under 1.5 MB.";
    }

    formData.set("media", file);
    return null;
  }
}

function GuideSection({ kind }: { kind: GuideKind }) {
  const details = copy[kind];
  const [guides, setGuides] = useState<Guide[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaKey, setMediaKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editMediaKey, setEditMediaKey] = useState(0);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/guides?kind=${kind}`);
    const json = (await response.json()) as {
      error?: string;
      guides?: Guide[];
    };

    if (!response.ok) {
      setError(json.error ?? "Could not load guides.");
      setLoading(false);
      return;
    }

    setGuides(json.guides ?? []);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [kind]);

  function startEdit(guide: Guide) {
    setEditingId(guide.id);
    setEditTitle(guide.title);
    setEditBody(guide.body);
    setEditMediaFile(null);
    setEditMediaKey((value) => value + 1);
    setRemoveMedia(false);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditMediaFile(null);
    setRemoveMedia(false);
  }

  async function addGuide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("title", title);
      formData.set("body", body);

      const mediaError = await attachMedia(formData, mediaFile);

      if (mediaError) {
        setError(mediaError);
        return;
      }

      const response = await fetch("/api/guides", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(json.error ?? "Could not save that.");
        return;
      }

      setTitle("");
      setBody("");
      setMediaFile(null);
      setMediaKey((value) => value + 1);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("title", editTitle);
      formData.set("body", editBody);

      if (removeMedia && !editMediaFile) {
        formData.set("removeMedia", "true");
      }

      const mediaError = await attachMedia(formData, editMediaFile);

      if (mediaError) {
        setError(mediaError);
        return;
      }

      const response = await fetch(`/api/guides/${editingId}`, {
        method: "PATCH",
        body: formData,
      });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(json.error ?? "Could not save those changes.");
        return;
      }

      cancelEdit();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeGuide(id: string) {
    const response = await fetch(`/api/guides/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setError(json.error ?? "Could not remove that.");
      return;
    }

    if (editingId === id) {
      cancelEdit();
    }

    setGuides((current) => current.filter((guide) => guide.id !== id));
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{details.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{details.description}</p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Add one</CardTitle>
          <CardDescription>
            A short title, the suggestion, and an optional photo or video.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void addGuide(event)}>
            <div className="space-y-2">
              <Label htmlFor={`${kind}-title`}>Title</Label>
              <Input
                id={`${kind}-title`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${kind}-body`}>Details</Label>
              <textarea
                id={`${kind}-body`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                required
                rows={5}
                maxLength={8000}
                className={textareaClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${kind}-media`}>Photo or video</Label>
              <Input
                key={mediaKey}
                id={`${kind}-media`}
                type="file"
                accept={GUIDE_MEDIA_ACCEPT}
                onChange={(event) => {
                  setMediaFile(event.target.files?.[0] ?? null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Optional. JPG, PNG, WebP, GIF, MP4, or WebM · max 50 MB
                {mediaFile ? ` · ${mediaFile.name}` : ""}
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving && !editingId ? "Saving…" : "Publish"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : guides.length === 0 ? (
        <p className="text-sm text-muted-foreground">{details.empty}</p>
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => {
            const isEditing = editingId === guide.id;

            return (
              <li key={guide.id}>
                <Card className="border-border/60 shadow-sm">
                  {isEditing ? (
                    <form onSubmit={(event) => void saveEdit(event)}>
                      <CardHeader className="space-y-3">
                        <CardTitle className="text-base">Edit this plan</CardTitle>
                        <div className="space-y-2">
                          <Label htmlFor={`${kind}-edit-title-${guide.id}`}>
                            Title
                          </Label>
                          <Input
                            id={`${kind}-edit-title-${guide.id}`}
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            maxLength={120}
                            required
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${kind}-edit-body-${guide.id}`}>
                            Details
                          </Label>
                          <textarea
                            id={`${kind}-edit-body-${guide.id}`}
                            value={editBody}
                            onChange={(event) => setEditBody(event.target.value)}
                            required
                            rows={5}
                            maxLength={8000}
                            className={textareaClassName}
                          />
                        </div>
                        {guide.mediaUrl && !removeMedia && !editMediaFile ? (
                          <GuideMedia
                            url={guide.mediaUrl}
                            type={guide.mediaType}
                            title={guide.title}
                          />
                        ) : null}
                        <div className="space-y-2">
                          <Label htmlFor={`${kind}-edit-media-${guide.id}`}>
                            Replace photo or video
                          </Label>
                          <Input
                            key={editMediaKey}
                            id={`${kind}-edit-media-${guide.id}`}
                            type="file"
                            accept={GUIDE_MEDIA_ACCEPT}
                            onChange={(event) => {
                              setEditMediaFile(event.target.files?.[0] ?? null);
                              setRemoveMedia(false);
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Leave empty to keep the current file
                            {editMediaFile ? ` · ${editMediaFile.name}` : ""}
                          </p>
                        </div>
                        {guide.mediaUrl ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={removeMedia && !editMediaFile}
                              onChange={(event) => {
                                setRemoveMedia(event.target.checked);
                                if (event.target.checked) {
                                  setEditMediaFile(null);
                                  setEditMediaKey((value) => value + 1);
                                }
                              }}
                            />
                            Remove the current photo or video
                          </label>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" disabled={saving}>
                            {saving ? "Saving…" : "Save changes"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </form>
                  ) : (
                    <>
                      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                        <CardTitle className="text-base">{guide.title}</CardTitle>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEdit(guide)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void removeGuide(guide.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm text-foreground">
                          {guide.body}
                        </p>
                        <GuideMedia
                          url={guide.mediaUrl}
                          type={guide.mediaType}
                          title={guide.title}
                        />
                      </CardContent>
                    </>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AdminGuidesEditor() {
  return (
    <div className="space-y-12">
      <GuideSection kind="workout" />
      <GuideSection kind="nutrition" />
    </div>
  );
}
