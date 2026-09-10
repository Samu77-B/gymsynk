import { redirect } from "next/navigation";

import { TenantBrandingForm } from "@/components/tenant-branding-form";
import { TenantFeaturesForm } from "@/components/tenant-features-form";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const session = await getSession();

  if (!canManageStaff(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gym settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control which GymSynk modules your gym uses, and customise your brand.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Features</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reset can run class booking only — turn memberships off until you are
            ready to sell plans online.
          </p>
        </div>
        <TenantFeaturesForm />
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
