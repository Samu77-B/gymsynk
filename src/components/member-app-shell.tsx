"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  ScanLine,
  UserRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { DashboardPageTransition } from "@/components/dashboard-page-transition";
import { PoweredByGymSynk } from "@/components/powered-by-gymsynk";
import { ThemeToggle } from "@/components/theme-toggle";
import { memberAppHref, memberAppTabs, type MemberAppTab } from "@/lib/member-app";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import type { TenantBrand } from "@/lib/tenant-branding";
import type { TenantFeatures } from "@/lib/tenant-features";

const tabIcons: Record<MemberAppTab["href"], LucideIcon> = {
  "/member/book": CalendarDays,
  "/member/workouts": Dumbbell,
  "/member/nutrition": Utensils,
  "/member/access": ScanLine,
  "/member/activity": BarChart3,
  "/member/membership": UserRound,
};

function GymMark({ brand }: { brand: TenantBrand }) {
  if (brand.logoUrl) {
    return (
      <Image
        src={brand.logoUrl}
        alt={brand.name}
        width={120}
        height={28}
        className="h-6 w-auto max-w-[120px] object-contain"
        unoptimized={brand.logoUrl.startsWith("data:")}
      />
    );
  }

  return <span className="text-sm font-bold tracking-tight">{brand.name}</span>;
}

export function MemberAppShell({
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
  const tabs = memberAppTabs(features);
  const preview = session.role !== "member";
  const homeHref = preview ? (memberAppHref(features) ?? "/") : "/";

  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col border-x border-border bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          {preview ? (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2 text-xs">
              <p className="text-muted-foreground">Viewing the member app</p>
              <Link href="/" className="font-medium text-brand hover:underline">
                Back to office
              </Link>
            </div>
          ) : null}
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href={homeHref} className="min-w-0 flex-1">
              <GymMark brand={brand} />
            </Link>
            <ThemeToggle />
          </div>
          {tabs.length > 0 ? (
            <nav aria-label="Member" className="flex border-t border-border">
              {tabs.map((tab) => {
                const Icon = tabIcons[tab.href];
                const active = pathname.startsWith(tab.href);

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-2 text-[9px] font-semibold uppercase leading-none tracking-[0.04em]",
                      active ? "text-brand" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </header>

        <main className="flex-1 px-4 py-6">
          <DashboardPageTransition>{children}</DashboardPageTransition>
        </main>

        <footer className="sticky bottom-0 z-30 border-t border-border bg-background pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <PoweredByGymSynk className="justify-center py-2" />
        </footer>
      </div>
    </div>
  );
}
