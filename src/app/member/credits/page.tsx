import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { format, parseISO } from "date-fns";

import { getTenantBySlug } from "@/lib/membership-provision";
import { listPacksForUser } from "@/lib/packs";
import {
  creditPolicySummary,
  resolveBillingModel,
} from "@/lib/tenant-billing";
import { getTenantFeatures } from "@/lib/tenant-features";
import { redirect } from "next/navigation";

export default async function MemberCreditsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const features = await getTenantFeatures(session.tenantSlug);
  const tenant = await getTenantBySlug(session.tenantSlug);

  if (!tenant || !features?.sessionPacks) {
    redirect("/member/book");
  }

  const billingModel = resolveBillingModel(tenant);
  const packs = await listPacksForUser(session.tenantId, session.userId);
  const active = packs.filter((entry) => entry.pack.status === "active");
  const totalRemaining = active.reduce((sum, entry) => {
    if (entry.unlimited) {
      return sum;
    }

    return sum + Math.max(entry.remaining ?? 0, 0);
  }, 0);

  const buyHref = `/buy?tenant=${encodeURIComponent(session.tenantSlug)}`;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Class credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {billingModel === "credits_only" ? (
            <p className="text-sm text-muted-foreground">
              Your login stays active even when you have no credits. Buy another
              package anytime to keep booking classes.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Credits are used when you book a class. Membership billing is
              managed separately.
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            {creditPolicySummary(tenant.creditRollover)}
          </p>

          <p className="text-2xl font-semibold">
            {active.some((entry) => entry.unlimited)
              ? "Unlimited sessions"
              : `${totalRemaining} credit${totalRemaining === 1 ? "" : "s"} available`}
          </p>

          {totalRemaining <= 2 && !active.some((entry) => entry.unlimited) ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {totalRemaining === 0
                ? "You're out of credits. Purchase a package to book your next class."
                : "You're running low on credits. Top up so you're ready for your next class."}
            </p>
          ) : null}

          <Button render={<Link href={buyHref} />}>Buy credits</Button>
        </CardContent>
      </Card>

      {active.length > 0 ? (
        <ul className="space-y-3">
          {active.map((entry) => (
            <li key={entry.pack.id}>
              <Card>
                <CardContent className="space-y-1 pt-6 text-sm">
                  <p className="font-medium">{entry.pack.label}</p>
                  <p className="text-muted-foreground">
                    {entry.tier?.name ?? "All classes"} ·{" "}
                    {entry.unlimited
                      ? "Unlimited"
                      : `${entry.remaining ?? 0} of ${entry.pack.sessionsPerPeriod ?? 0} left`}{" "}
                    · until{" "}
                    {format(parseISO(entry.pack.currentPeriodEnd.toISOString()), "d MMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No active credit packages.{" "}
          <Link className="underline" href={buyHref}>
            Buy your first package
          </Link>
          .
        </p>
      )}
    </div>
  );
}
