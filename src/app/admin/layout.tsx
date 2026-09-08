import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { getSession } from "@/lib/auth";
import { getTenantBrand } from "@/lib/tenant-branding";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const brand = await getTenantBrand(session.tenantSlug);

  return (
    <DashboardShell session={session} brand={brand}>
      {children}
    </DashboardShell>
  );
}
