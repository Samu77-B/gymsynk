import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSession } from "@/lib/auth";
import { getTenantBrand } from "@/lib/tenant-branding";
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

  const [brand, features] = await Promise.all([
    getTenantBrand(session.tenantSlug),
    getTenantFeatures(session.tenantSlug),
  ]);

  return (
    <DashboardShell
      session={session}
      brand={brand}
      features={features ?? { memberships: true, classBooking: true, sessionPacks: false }}
    >
      {children}
    </DashboardShell>
  );
}
