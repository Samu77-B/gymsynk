"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function JoinSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function completeSignup() {
      if (!sessionId) {
        setError("Missing checkout session.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/membership/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not finish signup");
        setLoading(false);
        return;
      }

      setLoading(false);
      window.location.href = "/member/membership";
    }

    void completeSignup();
  }, [sessionId]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {loading ? "Setting up your membership..." : "Welcome to Reset"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Confirming your free trial and signing you in.
          </p>
        ) : null}
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Button render={<Link href="/join" />}>Back to join</Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
