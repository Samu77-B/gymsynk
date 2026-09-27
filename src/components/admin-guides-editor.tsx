"use client";

import { useEffect, useState } from "react";

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

type GuideKind = "workout" | "nutrition";

type Guide = {
  id: string;
  title: string;
  body: string;
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

function GuideSection({ kind }: { kind: GuideKind }) {
  const details = copy[kind];
  const [guides, setGuides] = useState<Guide[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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

  async function addGuide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, body }),
      });
      const json = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(json.error ?? "Could not save that.");
        return;
      }

      setTitle("");
      setBody("");
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
          <CardDescription>A short title and the suggestion itself.</CardDescription>
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
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Publish"}
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
          {guides.map((guide) => (
            <li key={guide.id}>
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle className="text-base">{guide.title}</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void removeGuide(guide.id)}
                  >
                    Remove
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {guide.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
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
