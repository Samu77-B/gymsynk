"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  maxMembers: number;
  priceMonthly: string;
  trialDays: number;
  checkoutEnabled: boolean;
};

type TenantInfo = {
  name: string;
  slug: string;
};

export function JoinForm({
  tenantSlug,
  cancelled,
}: {
  tenantSlug: string;
  cancelled?: boolean;
}) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      const response = await fetch(
        `/api/membership/plans?tenant=${encodeURIComponent(tenantSlug)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not load membership plans");
        return;
      }

      setTenant(data.tenant);
      setPlans(data.plans ?? []);
      if (data.plans?.[0]) {
        setSelectedPlanId(data.plans[0].id);
      }
    }

    void loadPlans();
  }, [tenantSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedPlanId) {
      setError("Choose a membership plan.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/membership/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug,
        planId: selectedPlanId,
        fullName,
        email,
        phone: phone || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Could not start checkout");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Join {tenant?.name ?? "the gym"}
        </h1>
        <p className="text-muted-foreground">
          Choose your plan, add your details, and start with your free trial.
        </p>
      </div>

      {cancelled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Checkout was cancelled. You can try again when you are ready.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const selected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:border-primary/40"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{plan.name}</h2>
                {plan.maxMembers > 1 ? (
                  <Badge variant="secondary">{plan.maxMembers} people</Badge>
                ) : null}
              </div>
              <p className="text-2xl font-semibold">
                £{plan.priceMonthly}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.trialDays} days free, then billed monthly
              </p>
              {plan.description ? (
                <p className="mt-3 text-sm">{plan.description}</p>
              ) : null}
              {!plan.checkoutEnabled ? (
                <p className="mt-3 text-xs text-amber-700">
                  Online signup coming soon
                </p>
              ) : null}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            {selectedPlan ? (
              <p className="text-sm text-muted-foreground">
                You will enter card details on Stripe. Your first{" "}
                {selectedPlan.trialDays} days are free; billing starts after
                the trial unless you cancel.
              </p>
            ) : null}

            <Button
              className="w-full"
              type="submit"
              disabled={loading || !selectedPlan?.checkoutEnabled}
            >
              {loading ? "Redirecting..." : "Continue to secure checkout"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
