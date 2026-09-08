import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  TrendingUp,
  Users,
} from "lucide-react";

import { AuthShell } from "@/components/auth-shell";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { getTenantBrand } from "@/lib/tenant-branding";

const quickLinks = [
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
  },
];

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <AuthShell>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to GymSynk</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Gym management software for modern fitness businesses. Join online
              or log in to manage your gym.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button render={<Link href="/join?tenant=reset" />}>
                Join Reset — first month free
              </Button>
              <Button variant="outline" render={<Link href="/login" />}>
                Log in
              </Button>
            </div>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  const brand = await getTenantBrand(session.tenantSlug);
  const links = quickLinks.filter((link) => link.roles.includes(session.role));

  return (
    <DashboardShell session={session} brand={brand}>
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
                    <Button
                      size="sm"
                      render={<Link href={link.href} />}
                    >
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
