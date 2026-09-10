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
import {
  TENANT_FEATURE_LABELS,
  type TenantFeatureKey,
  type TenantFeatures,
} from "@/lib/tenant-features";
import { cn } from "@/lib/utils";

const featureOrder: TenantFeatureKey[] = [
  "memberships",
  "classBooking",
  "sessionPacks",
];

export function TenantFeaturesForm() {
  const router = useRouter();
  const [features, setFeatures] = useState<TenantFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/tenant/features");
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not load features");
        setLoading(false);
        return;
      }

      setFeatures(json.features as TenantFeatures);
      setLoading(false);
    }

    void load();
  }, []);

  function toggleFeature(key: TenantFeatureKey) {
    if (!features || TENANT_FEATURE_LABELS[key].comingSoon) {
      return;
    }

    setFeatures({ ...features, [key]: !features[key] });
  }

  async function handleSave() {
    if (!features) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/tenant/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not save features");
        return;
      }

      setFeatures(json.features as TenantFeatures);
      setMessage("Features updated. Navigation and public pages will reflect your changes.");
      router.refresh();
    } catch {
      setError("Could not save features. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading features…</p>;
  }

  if (!features) {
    return <p className="text-sm text-destructive">{error ?? "Features unavailable"}</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Gym features</CardTitle>
          <CardDescription>
            Turn modules on or off for your gym. Disabled features are hidden
            from your dashboard, member area, and public join flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureOrder.map((key) => {
            const meta = TENANT_FEATURE_LABELS[key];
            const enabled = features[key];
            const disabled = meta.comingSoon;

            return (
              <div
                key={key}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4",
                  disabled && "opacity-70",
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{meta.title}</p>
                    {disabled ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Coming soon
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${meta.title}`}
                  disabled={disabled || saving}
                  onClick={() => toggleFeature(key)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed",
                    enabled ? "bg-brand" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
                      enabled ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving…" : "Save features"}
      </Button>
    </div>
  );
}
