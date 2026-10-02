"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PackOption = {
  id: string;
  label: string;
  price: string;
  sessionCount: number | null;
  note: string | null;
};

type Tier = {
  id: string;
  name: string;
  subtitle: string | null;
  pricePerClass: string;
  packs: PackOption[];
};

export function BuyForm({
  tenantSlug,
  cancelled,
}: {
  tenantSlug: string;
  cancelled?: boolean;
}) {
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [creditPolicy, setCreditPolicy] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch(
        `/api/packs/plans?tenant=${encodeURIComponent(tenantSlug)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not load credit packages");
        return;
      }

      setTenantName(data.tenant.name);
      setCreditPolicy(data.creditPolicy ?? null);
      setTiers(data.tiers ?? []);

      const firstPack = data.tiers?.[0]?.packs?.[0];
      if (firstPack) {
        setSelectedPackId(firstPack.id);
      }
    }

    void load();
  }, [tenantSlug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedPackId) {
      setError("Choose a credit package.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/packs/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantSlug,
        packOptionId: selectedPackId,
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

  const selectedPack = tiers
    .flatMap((tier) => tier.packs)
    .find((pack) => pack.id === selectedPackId);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Buy class credits
        </h1>
        <p className="text-muted-foreground">
          {tenantName ?? "Your gym"} — purchase a package, get a login, and book
          classes with credits. Your account stays active when credits run out.
        </p>
        {creditPolicy ? (
          <p className="text-sm text-muted-foreground">{creditPolicy}</p>
        ) : null}
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

      <div className="space-y-6">
        {tiers.map((tier) => (
          <Card key={tier.id}>
            <CardHeader>
              <CardTitle className="text-lg">{tier.name}</CardTitle>
              {tier.subtitle ? (
                <p className="text-sm text-muted-foreground">{tier.subtitle}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  £{Number(tier.pricePerClass).toFixed(2)} per class reference
                </p>
              )}
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {tier.packs.map((pack) => {
                const selected = pack.id === selectedPackId;

                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:border-primary/40"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h2 className="font-semibold">{pack.label}</h2>
                      {pack.sessionCount ? (
                        <Badge variant="secondary">
                          {pack.sessionCount} credits
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-2xl font-semibold">
                      £{Number(pack.price).toFixed(0)}
                    </p>
                    {pack.note ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {pack.note}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}
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

            {selectedPack ? (
              <p className="text-sm text-muted-foreground">
                You will pay securely on Stripe. After payment you&apos;ll be
                signed in and can book classes with your {selectedPack.label}{" "}
                credits.
              </p>
            ) : null}

            <Button
              className="w-full"
              type="submit"
              disabled={loading || !selectedPackId}
            >
              {loading ? "Redirecting…" : "Continue to secure checkout"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="underline" href="/login">
                Log in
              </Link>{" "}
              to buy more credits or book classes.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
