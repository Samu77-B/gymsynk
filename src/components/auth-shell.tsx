import Image from "next/image";
import Link from "next/link";

import { PoweredByGymSynk } from "@/components/powered-by-gymsynk";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenantBrandStyles } from "@/components/tenant-brand-styles";
import type { TenantBrand } from "@/lib/tenant-branding";

export function AuthShell({
  brand,
  children,
  hideLoginLink = false,
}: {
  brand?: TenantBrand | null;
  children: React.ReactNode;
  hideLoginLink?: boolean;
}) {
  return (
    <>
      {brand ? <TenantBrandStyles brand={brand} /> : null}
      <div className="flex min-h-screen flex-col bg-muted/30 dark:bg-background">
        <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            {brand ? (
              <span className="text-lg font-bold tracking-tight">
                {brand.name}
              </span>
            ) : (
              <Image
                src="/GymSynk-Logo02-B-Wht.png"
                alt="GymSynk"
                width={140}
                height={32}
                className="h-7 w-auto invert dark:invert-0"
              />
            )}
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!hideLoginLink ? (
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Log in
              </Link>
            ) : null}
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="border-t border-border bg-background py-4">
          <PoweredByGymSynk className="justify-center" />
        </footer>
      </div>
    </>
  );
}
