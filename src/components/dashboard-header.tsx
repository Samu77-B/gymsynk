"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/lib/auth";
import type { TenantBrand } from "@/lib/tenant-branding";

export function DashboardHeader({
  session,
  brand,
  onMenuClick,
}: {
  session: SessionUser;
  brand: TenantBrand;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-4 sm:px-6">
      <button
        type="button"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation menu"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
      </button>

      <Link href="/" className="flex shrink-0 items-center lg:hidden">
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt={brand.name}
            width={120}
            height={28}
            className="h-6 w-auto max-w-[120px] object-contain"
            unoptimized={brand.logoUrl.startsWith("data:")}
          />
        ) : (
          <span className="text-sm font-bold tracking-tight">{brand.name}</span>
        )}
      </Link>

      <div className="relative hidden min-w-0 flex-1 md:block md:max-w-xl">
        <input
          type="search"
          placeholder="Search members, staff, or actions…"
          className="h-9 w-full rounded-lg border border-input bg-muted/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50 focus:bg-background focus:ring-2 focus:ring-brand/20"
          disabled
          aria-label="Search (coming soon)"
        />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <div className="hidden text-right sm:block">
          <p className="max-w-[140px] truncate text-sm font-medium leading-none md:max-w-none">
            {session.fullName}
          </p>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
            {session.role}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
