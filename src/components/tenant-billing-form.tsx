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
  BILLING_MODEL_LABELS,
  CREDIT_ROLLOVER_LABELS,
  billingModelUsesCredits,
  type BillingModel,
} from "@/lib/tenant-billing";
import { cn } from "@/lib/utils";

export function TenantBillingForm() {
  const router = useRouter();
  const [billingModel, setBillingModel] = useState<BillingModel | null>(null);
  const [creditRollover, setCreditRollover] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/tenant/billing");
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not load billing settings");
        setLoading(false);
        return;
      }

      setBillingModel(json.billingModel as BillingModel);
      setCreditRollover(Boolean(json.creditRollover));
      setLoading(false);
    }

    void load();
  }, []);

  async function handleSave() {
    if (!billingModel) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/tenant/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingModel, creditRollover }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not save billing model");
        return;
      }

      setBillingModel(json.billingModel as BillingModel);
      setCreditRollover(Boolean(json.creditRollover));
      setMessage(
        "Billing settings updated. Membership and pack modules were aligned to match.",
      );
      router.refresh();
    } catch {
      setError("Could not save billing settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>;
  }

  if (!billingModel) {
    return (
      <p className="text-sm text-destructive">{error ?? "Billing unavailable"}</p>
    );
  }

  const options: BillingModel[] = [
    "credits_only",
    "membership_only",
    "hybrid",
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>How clients pay</CardTitle>
          <CardDescription>
            Choose how your gym charges for classes. This controls join flows,
            booking rules, and which modules are enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map((model) => {
            const meta = BILLING_MODEL_LABELS[model];
            const selected = billingModel === model;

            return (
              <button
                key={model}
                type="button"
                onClick={() => setBillingModel(model)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition",
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border/60 hover:border-primary/40",
                )}
              >
                <p className="font-medium">{meta.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {billingModel && billingModelUsesCredits(billingModel) ? (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Unused credits</CardTitle>
            <CardDescription>
              Applies to all session credit packages at your gym. Members see
              this on the buy credits page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { rollover: false, meta: CREDIT_ROLLOVER_LABELS.expire },
                { rollover: true, meta: CREDIT_ROLLOVER_LABELS.rollover },
              ] as const
            ).map(({ rollover, meta }) => {
              const selected = creditRollover === rollover;

              return (
                <button
                  key={String(rollover)}
                  type="button"
                  onClick={() => setCreditRollover(rollover)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition",
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/60 hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">{meta.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving…" : "Save billing model"}
      </Button>
    </div>
  );
}
