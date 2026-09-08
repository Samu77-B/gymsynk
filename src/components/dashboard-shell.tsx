import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { TenantBrandStyles } from "@/components/tenant-brand-styles";
import type { SessionUser } from "@/lib/auth";
import type { TenantBrand } from "@/lib/tenant-branding";

export function DashboardShell({
  session,
  brand,
  children,
}: {
  session: SessionUser;
  brand: TenantBrand;
  children: React.ReactNode;
}) {
  return (
    <>
      <TenantBrandStyles brand={brand} />
      <div className="flex min-h-screen bg-muted/30 dark:bg-background">
        <DashboardSidebar session={session} brand={brand} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader session={session} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
