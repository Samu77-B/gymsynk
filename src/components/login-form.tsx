"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function LoginForm({
  initialTenantSlug,
  redirectTo,
}: {
  initialTenantSlug?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tenantSlug, setTenantSlug] = useState(initialTenantSlug ?? "reset");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tenantSlug }),
    });

    if (!response.ok) {
      const data = await response.json();
      if (data.error === "Tenant not found") {
        setError(
          "Gym not found on this server’s database. Check that Vercel DATABASE_URL matches the Neon database where you ran npm run db:seed-reset.",
        );
      } else {
        setError(data.error ?? "Login failed");
      }
      setLoading(false);
      return;
    }

    router.push(safeRedirect(redirectTo));
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="tenantSlug">Gym slug</Label>
            <Input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
              placeholder="reset"
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Staff accounts are created when you run <code>npm run db:seed-reset</code>.
        </p>
      </CardContent>
    </Card>
  );
}
