"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BuySuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const tenantSlug = searchParams.get("tenant") ?? undefined;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function completeSignup() {
      if (!sessionId) {
        setError("Missing checkout session.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, tenantSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not finish checkout");
        setLoading(false);
        return;
      }

      window.location.href = data.redirectTo ?? "/member/book";
    }

    void completeSignup();
  }, [sessionId, tenantSlug]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {loading ? "Setting up your account…" : "Welcome"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Confirming payment and signing you in.
          </p>
        ) : null}
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Button render={<Link href="/buy" />}>Back to buy credits</Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
