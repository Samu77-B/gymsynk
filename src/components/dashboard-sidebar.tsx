"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/logout-button";
import { PoweredByGymSynk } from "@/components/powered-by-gymsynk";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import type { TenantBrand } from "@/lib/tenant-branding";
import type { TenantFeatureKey, TenantFeatures } from "@/lib/tenant-features";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SessionUser["role"][];
  feature?: TenantFeatureKey;
};

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["owner", "admin", "trainer", "member"],
  },
  {
    href: "/admin/members",
    label: "Members",
    icon: Users,
    roles: ["owner", "admin"],
  },
  {
    href: "/admin/staff",
    label: "Staff team",
    icon: UserCog,
    roles: ["owner", "admin"],
  },
  {
    href: "/admin/schedule",
    label: "Schedule",
    icon: CalendarDays,
    roles: ["owner", "admin", "trainer"],
  },
  {
    href: "/admin/roster",
    label: "Staff roster",
    icon: ClipboardList,
    roles: ["owner", "admin"],
  },
  {
    href: "/member/membership",
    label: "Membership",
    icon: CreditCard,
    roles: ["member", "owner", "admin"],
    feature: "memberships",
  },
  {
    href: "/member/book",
    label: "Book classes",
    icon: CalendarDays,
    roles: ["owner", "admin", "trainer", "member"],
    feature: "classBooking",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["owner", "admin"],
  },
];

function TenantLogo({ brand }: { brand: TenantBrand }) {
  if (brand.logoUrl) {
    return (
      <Image
        src={brand.logoUrl}
        alt={brand.name}
        width={140}
        height={36}
        className="h-8 w-auto max-w-[140px] object-contain object-left"
        unoptimized={brand.logoUrl.startsWith("data:")}
      />
    );
  }

  return (
    <span className="text-lg font-bold tracking-tight">
      {brand.name}
    </span>
  );
}

export function DashboardSidebar({
  session,
  brand,
  features,
  mobileOpen = false,
  onNavigate,
  className,
}: {
  session: SessionUser;
  brand: TenantBrand;
  features: TenantFeatures;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (item) =>
      item.roles.includes(session.role) &&
      (!item.feature || features[item.feature]),
  );

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar shadow-xl lg:shadow-none",
        className,
      )}
    >
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href="/" className="block">
          <TenantLogo brand={brand} />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-[var(--nav-active-border)] bg-[var(--nav-active-bg)] text-foreground shadow-sm"
                  : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-[var(--brand-highlight)]" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
            {session.fullName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session.fullName}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {session.role.replace("_", " ")}
            </p>
          </div>
        </div>
        <LogoutButton className="w-full justify-start" />
        <PoweredByGymSynk variant="sidebar" className="mt-4" />
      </div>
    </aside>
  );
}
