import { Bell, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionUser } from "@/lib/auth";

export function DashboardHeader({ session }: { session: SessionUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search members, staff, or actions…"
          className="h-9 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/50 focus:bg-background focus:ring-2 focus:ring-brand/20"
          disabled
          aria-label="Search (coming soon)"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand" />
        </button>
        <ThemeToggle />
        <div className="ml-2 hidden items-center gap-2 border-l border-border pl-4 sm:flex">
          <div className="text-right">
            <p className="text-sm font-medium leading-none">{session.fullName}</p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {session.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
