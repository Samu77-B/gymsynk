"use client";

import { useRouter } from "next/navigation";
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
import type { TenantEmbedUrls } from "@/lib/tenant-website";

type WebsiteSettings = {
  websiteUrl: string | null;
  externalBookUrl: string | null;
};

function CopyBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function TenantWebsiteForm() {
  const router = useRouter();
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [embed, setEmbed] = useState<TenantEmbedUrls | null>(null);
  const [corsHint, setCorsHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/tenant/website");
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not load website settings");
        setLoading(false);
        return;
      }

      setSettings(json.website as WebsiteSettings);
      setEmbed(json.embed as TenantEmbedUrls);
      setCorsHint(json.corsHint ?? null);
      setLoading(false);
    }

    void load();
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/tenant/website", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: settings.websiteUrl?.trim() || null,
          externalBookUrl: settings.externalBookUrl?.trim() || null,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not save website settings");
        return;
      }

      setSettings(json.website as WebsiteSettings);
      setEmbed(json.embed as TenantEmbedUrls);
      setMessage("Website integration saved. Embed links updated.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Loading website settings…
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your website</CardTitle>
          <CardDescription>
            Connect your gym site to GymSynk — live schedule embed, booking links,
            and member login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://resetstudios.co.uk"
                value={settings.websiteUrl ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current!,
                    websiteUrl: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Your public marketing site. Used for reference and future
                integrations.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalBookUrl">Book button URL (optional)</Label>
              <Input
                id="externalBookUrl"
                type="url"
                placeholder="Leave blank to use GymSynk login / join"
                value={settings.externalBookUrl ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current!,
                    externalBookUrl: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Where the embed &quot;Book a Session&quot; button goes. If empty,
                members go to GymSynk login (or join when memberships are on).
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save website settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {embed ? (
        <Card>
          <CardHeader>
            <CardTitle>Embed on your website</CardTitle>
            <CardDescription>
              Paste one of these into your site builder (Reset Studios, Squarespace,
              WordPress, etc.). Publish your schedule in GymSynk first so the feed
              stays current.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <CopyBlock label="Schedule iframe" code={embed.iframeSnippet} />
            <CopyBlock label="Schedule JavaScript embed" code={embed.scriptSnippet} />
            <CopyBlock
              label="Group training packages iframe"
              code={embed.packagesIframeSnippet}
            />
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Public schedule API:</span>{" "}
                <a
                  className="break-all underline"
                  href={embed.scheduleApi}
                  target="_blank"
                  rel="noreferrer"
                >
                  {embed.scheduleApi}
                </a>
              </p>
              <p>
                <span className="font-medium">Schedule preview:</span>{" "}
                <a
                  className="break-all underline"
                  href={embed.embedPage}
                  target="_blank"
                  rel="noreferrer"
                >
                  {embed.embedPage}
                </a>
              </p>
              <p>
                <span className="font-medium">Packages API:</span>{" "}
                <a
                  className="break-all underline"
                  href={embed.packagesApi}
                  target="_blank"
                  rel="noreferrer"
                >
                  {embed.packagesApi}
                </a>
              </p>
              <p>
                <span className="font-medium">Packages preview:</span>{" "}
                <a
                  className="break-all underline"
                  href={embed.packagesEmbedPage}
                  target="_blank"
                  rel="noreferrer"
                >
                  {embed.packagesEmbedPage}
                </a>
              </p>
            </div>
            {corsHint ? (
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {corsHint} Example:{" "}
                <code>PUBLIC_SCHEDULE_CORS_ORIGINS=https://yourgym.co.uk</code>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
