"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DashboardPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={cn("animate-dashboard-unfold min-w-0")}>
      {children}
    </div>
  );
}
