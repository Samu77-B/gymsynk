import Image from "next/image";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#embed", label: "Embed" },
  { href: "/demo", label: "Demo gym" },
];

export function MarketingHeader({ current }: { current?: "demo" }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md dark:bg-neutral-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/GymSynk-Logo02-B-Wht.png"
            alt="GymSynk"
            width={148}
            height={32}
            className="h-7 w-auto dark:invert-0"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            const active = link.href === "/demo" && current === "demo";
            const className = cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              active ? "text-foreground" : "text-muted-foreground",
            );

            if (link.href.startsWith("/#")) {
              return (
                <a key={link.href} href={link.href} className={className}>
                  {link.label}
                </a>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/demo"
            aria-current={current === "demo" ? "page" : undefined}
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground md:hidden",
              current === "demo" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Demo gym
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Image
            src="/GymSynk-Logo02-B-Wht.png"
            alt="GymSynk"
            width={120}
            height={28}
            className="h-6 w-auto dark:invert-0"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            SmartSynk · Paradigm Studio · gymsynk.net
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a
            href="https://www.paysynk.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            PaySynk
          </a>
          <Link href="/demo" className="hover:text-foreground">
            Demo gym
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/join?tenant=reset" className="hover:text-foreground">
            Join Reset
          </Link>
          <Link href="/embed/reset/schedule" className="hover:text-foreground">
            Schedule embed
          </Link>
        </div>
      </div>
    </footer>
  );
}
