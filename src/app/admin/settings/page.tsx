import { redirect } from "next/navigation";

import { Suspense } from "react";

import { TenantBillingForm } from "@/components/tenant-billing-form";
import { TenantBrandingForm } from "@/components/tenant-branding-form";
import { TenantFeaturesForm } from "@/components/tenant-features-form";
import { TenantStripeForm } from "@/components/tenant-stripe-form";
import { TenantWebsiteForm } from "@/components/tenant-website-form";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const session = await getSession();

  if (!canManageStaff(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gym settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which GymSynk modules your gym uses, and customise your brand.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Billing model</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Credits only, membership only, or both — how clients pay for classes.
          </p>
        </div>
        <TenantBillingForm />
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <div>
          <h2 className="text-lg font-semibold">Stripe &amp; payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your gym&apos;s Stripe account for member payments, and manage
            your GymSynk platform subscription.
          </p>
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading Stripe…</p>
          }
        >
          <TenantStripeForm />
        </Suspense>
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <div>
          <h2 className="text-lg font-semibold">Features</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Turn modules on or off for your gym. Reset has all features enabled
            for platform testing.
          </p>
        </div>
        <TenantFeaturesForm />
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <div>
          <h2 className="text-lg font-semibold">Website integration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Embed your live class schedule on your gym website and control where
            booking buttons send members.
          </p>
        </div>
        <TenantWebsiteForm />
      </section>

      <section className="space-y-4 border-t border-border pt-10">
        <div>
          <h2 className="text-lg font-semibold">Branding</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Logo and accent colour shown across your dashboard and member areas.
          </p>
        </div>
        <TenantBrandingForm />
      </section>
    </div>
  );
}
