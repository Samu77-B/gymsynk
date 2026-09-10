"use client";

import Image from "next/image";
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

type Branding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

export function TenantBrandingForm() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#E60000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/tenant/branding");
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not load branding");
        setLoading(false);
        return;
      }

      const data = json.branding as Branding;
      setBranding(data);
      setLogoUrl(data.logoUrl ?? "");
      setPrimaryColor(data.primaryColor ?? "#E60000");
      setLoading(false);
    }

    void load();
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setPreviewUrl(logoUrl || null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile, logoUrl]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("primaryColor", primaryColor);

    if (logoFile) {
      formData.set("logo", logoFile);
    } else if (logoUrl.trim()) {
      formData.set("logoUrl", logoUrl.trim());
    } else {
      formData.set("logoUrl", "");
    }

    const response = await fetch("/api/tenant/branding", {
      method: "PATCH",
      body: formData,
    });

    const json = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(json.error ?? "Could not save branding");
      return;
    }

    const data = json.branding as Branding;
    setBranding(data);
    setLogoUrl(data.logoUrl ?? "");
    setLogoFile(null);
    setMessage("Branding saved. Your dashboard will refresh with the new look.");
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading branding…</p>;
  }

  if (error && !branding) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Gym logo</CardTitle>
          <CardDescription>
            Upload a logo or paste a URL. It appears in the sidebar and member
            areas for {branding?.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={`${branding?.name ?? "Gym"} logo preview`}
                width={180}
                height={48}
                className="h-12 w-auto max-w-[180px] object-contain"
                unoptimized={previewUrl.startsWith("blob:")}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No logo yet — upload one below
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-file">Upload logo</Label>
            <Input
              id="logo-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setLogoFile(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP, or SVG · max 2 MB
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-url">Or logo URL</Label>
            <Input
              id="logo-url"
              type="url"
              placeholder="https://yourgym.com/logo.png"
              value={logoUrl}
              onChange={(event) => {
                setLogoFile(null);
                setLogoUrl(event.target.value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Brand colour</CardTitle>
          <CardDescription>
            Used for buttons, active navigation, and accents across your gym
            dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary colour</Label>
            <div className="flex items-center gap-3">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="size-10 cursor-pointer rounded-lg border border-input bg-transparent p-1"
              />
              <Input
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="w-32 font-mono uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {message ? (
        <p className="text-sm text-brand">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}
