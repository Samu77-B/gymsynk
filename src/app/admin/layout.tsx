import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSession } from "@/lib/auth";
import { getTenantBrand } from "@/lib/tenant-branding";
import { getTenantBillingModel } from "@/lib/tenant-billing";
import { getTenantFeatures } from "@/lib/tenant-features";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const [brand, features, billingModel] = await Promise.all([
    getTenantBrand(session.tenantSlug),
    getTenantFeatures(session.tenantSlug),
    getTenantBillingModel(session.tenantSlug),
  ]);

  return (
    <DashboardShell
      session={session}
      brand={brand}
      billingModel={billingModel ?? "membership_only"}
      features={
        features ?? {
          memberships: true,
          classBooking: true,
          sessionPacks: false,
          doorEntry: false,
        }
      }
    >
      {children}
    </DashboardShell>
  );
}
