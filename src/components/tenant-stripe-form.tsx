"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ConnectStatus = {
  accountId: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  readyForPayments: boolean;
  platformSubscriptionId: string | null;
  platformSubscriptionStatus: string | null;
};

export function TenantStripeForm() {
  const searchParams = useSearchParams();
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [platformPriceConfigured, setPlatformPriceConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    const response = await fetch(
      `/api/tenant/stripe${refresh ? "?refresh=1" : ""}`,
    );
    const json = await response.json();

    if (!response.ok) {
      setError(json.error ?? "Could not load Stripe settings");
      setLoading(false);
      return;
    }

    setConnect(json.connect as ConnectStatus);
    setPlatformPriceConfigured(Boolean(json.platformPriceConfigured));
    setLoading(false);
  }, []);

  useEffect(() => {
    const stripeReturn =
      searchParams.get("stripe") === "return" ||
      searchParams.get("stripe") === "refresh";
    const platformReturn = searchParams.get("platform") === "success";

    if (platformReturn) {
      setMessage("GymSynk platform subscription updated.");
    }

    void load(stripeReturn);
  }, [load, searchParams]);

  async function runAction(action: string) {
    setBusy(action);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tenant/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Stripe action failed");
        return;
      }

      if (json.url) {
        window.location.href = json.url as string;
        return;
      }

      await load(true);
      setMessage("Stripe status refreshed.");
    } catch {
      setError("Stripe action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function startPlatformCheckout() {
    setBusy("platform");
    setError(null);

    try {
      const response = await fetch("/api/tenant/stripe/platform-checkout", {
        method: "POST",
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error ?? "Could not start platform checkout");
        return;
      }

      window.location.href = json.url as string;
    } catch {
      setError("Could not start platform checkout.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading Stripe…</p>;
  }

  if (!connect) {
    return (
      <p className="text-sm text-destructive">{error ?? "Stripe unavailable"}</p>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-muted/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Stripe setup checklist</CardTitle>
          <CardDescription>
            Quick reference for owners and GymSynk support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              In the Stripe Dashboard (platform account), enable{" "}
              <strong className="text-foreground">Connect</strong> with Express
              accounts for the UK.
            </li>
            <li>
              Connect this gym below so member payments land in the gym&apos;s
              account (memberships, credit packs, and future merch).
            </li>
            <li>
              Create pack and membership{" "}
              <strong className="text-foreground">Prices</strong> on the{" "}
              <em>connected</em> account and paste Price IDs into Group training
              or membership plans.
            </li>
            <li>
              Point the Stripe webhook to{" "}
              <code className="rounded bg-muted px-1 text-xs">
                /api/webhooks/stripe
              </code>{" "}
              and enable Connect events plus checkout and subscription events.
            </li>
            <li>
              GymSynk sets{" "}
              <code className="rounded bg-muted px-1 text-xs">
                STRIPE_PRICE_GYMSYNK_PLATFORM
              </code>{" "}
              for the monthly platform fee — use Subscribe below once that price
              exists.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Gym payouts (Stripe Connect)</CardTitle>
          <CardDescription>
            Connect your gym&apos;s Stripe account so membership fees, credit
            package sales, and future shop payments go directly to you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">
                {connect.readyForPayments
                  ? "Ready to accept payments"
                  : connect.detailsSubmitted
                    ? "Details submitted — finishing setup"
                    : "Not connected"}
              </dd>
            </div>
            {connect.accountId ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="truncate font-mono text-xs">{connect.accountId}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void runAction("connect_onboarding")}
            >
              {connect.accountId ? "Continue Stripe setup" : "Connect Stripe"}
            </Button>
            {connect.accountId ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => void runAction("connect_dashboard")}
                >
                  Open Stripe dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => void runAction("connect_refresh")}
                >
                  Refresh status
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>GymSynk platform subscription</CardTitle>
          <CardDescription>
            Your gym&apos;s monthly fee for using GymSynk is billed separately
            on the platform Stripe account (configured by GymSynk).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subscription</dt>
              <dd className="font-medium">
                {connect.platformSubscriptionStatus ?? "Not subscribed"}
              </dd>
            </div>
          </dl>

          {platformPriceConfigured ? (
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() => void startPlatformCheckout()}
            >
              {connect.platformSubscriptionId
                ? "Manage GymSynk billing"
                : "Subscribe to GymSynk"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Platform billing is not configured on this environment yet
              (STRIPE_PRICE_GYMSYNK_PLATFORM).
            </p>
          )}
        </CardContent>
      </Card>

      {message ? <p className="text-sm text-brand">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
