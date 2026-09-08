import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function PoweredByGymSynk({
  className,
  variant = "inline",
}: {
  className?: string;
  variant?: "inline" | "sidebar";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        variant === "sidebar" && "flex-col gap-1 px-3 py-4",
        className,
      )}
    >
      <span>Powered by</span>
      <Link
        href="https://gymsynk.net"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-brand"
      >
        <Image
          src="/gymsynk-fav-02.png"
          alt=""
          width={14}
          height={14}
          className="size-3.5 dark:invert"
          aria-hidden
        />
        GymSynk
      </Link>
    </div>
  );
}
