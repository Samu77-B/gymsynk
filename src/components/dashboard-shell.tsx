"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardPageTransition } from "@/components/dashboard-page-transition";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { TenantBrandStyles } from "@/components/tenant-brand-styles";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import type { TenantBrand } from "@/lib/tenant-branding";
import type { TenantFeatures } from "@/lib/tenant-features";

export function DashboardShell({
  session,
  brand,
  features,
  children,
}: {
  session: SessionUser;
  brand: TenantBrand;
  features: TenantFeatures;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <>
      <TenantBrandStyles brand={brand} />
      <div className="flex min-h-screen min-h-dvh bg-muted/30 dark:bg-background">
        {mobileNavOpen ? (
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <DashboardSidebar
          session={session}
          brand={brand}
          features={features}
          mobileOpen={mobileNavOpen}
          onNavigate={() => setMobileNavOpen(false)}
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(100vw-3rem,17rem)] transition-transform duration-300 ease-out lg:static lg:z-auto lg:w-60 lg:translate-x-0",
            "animate-sidebar-unfold",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            session={session}
            brand={brand}
            onMenuClick={() => setMobileNavOpen(true)}
          />
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
            <DashboardPageTransition>{children}</DashboardPageTransition>
          </main>
        </div>
      </div>
    </>
  );
}
