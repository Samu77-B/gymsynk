import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard-shell";
import { LandingPage } from "@/components/marketing/landing-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getTenantBrand } from "@/lib/tenant-branding";
import { getTenantFeatures, type TenantFeatureKey } from "@/lib/tenant-features";

const quickLinks: Array<{
  href: string;
  title: string;
  description: string;
  icon: typeof CalendarDays;
  roles: Array<"owner" | "admin" | "trainer" | "member">;
  feature?: TenantFeatureKey;
}> = [
  {
    href: "/admin/schedule",
    title: "Schedule",
    description: "Weekly class calendar, trainers, and fill rates.",
    icon: CalendarDays,
    roles: ["owner", "admin", "trainer"],
  },
  {
    href: "/admin/members",
    title: "Members",
    description: "Member records, plans, and check-in history.",
    icon: Users,
    roles: ["owner", "admin"],
  },
  {
    href: "/admin/roster",
    title: "Staff roster",
    description: "Allocate trainer and staff shifts.",
    icon: ClipboardList,
    roles: ["owner", "admin"],
  },
  {
    href: "/member/book",
    title: "Book a class",
    description: "Reserve your next session.",
    icon: CalendarDays,
    roles: ["owner", "admin", "trainer", "member"],
    feature: "classBooking",
  },
  {
    href: "/admin/settings",
    title: "Gym settings",
    description: "Features, logo, and brand colours.",
    icon: Settings,
    roles: ["owner", "admin"],
  },
];

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return <LandingPage />;
  }

  const [brand, features] = await Promise.all([
    getTenantBrand(session.tenantSlug),
    getTenantFeatures(session.tenantSlug),
  ]);
  const tenantFeatures = features ?? {
    memberships: true,
    classBooking: true,
    sessionPacks: false,
  };
  const links = quickLinks.filter(
    (link) =>
      link.roles.includes(session.role) &&
      (!link.feature || tenantFeatures[link.feature]),
  );

  return (
    <DashboardShell session={session} brand={brand} features={tenantFeatures}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {session.fullName.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at {brand.name} today.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active members", value: "—", change: "Live data soon" },
            { label: "Check-ins today", value: "—", change: "Live data soon" },
            { label: "Classes this week", value: "—", change: "Live data soon" },
            { label: "Staff on shift", value: "—", change: "Live data soon" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/60 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-brand">
                  <TrendingUp className="size-3" />
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Quick actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Card
                  key={link.href}
                  className="group border-border/60 shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                      <Icon className="size-5 text-brand" />
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <p className="mt-1 mb-4 text-sm text-muted-foreground">
                      {link.description}
                    </p>
                    <Button size="sm" render={<Link href={link.href} />}>
                      Open
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
