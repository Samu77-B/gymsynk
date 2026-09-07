import Image from "next/image";
import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

const links = [
  { href: "/admin/schedule", label: "Schedule", roles: ["owner", "admin", "trainer"] },
  { href: "/admin/roster", label: "Staff roster", roles: ["owner", "admin"] },
  { href: "/admin/staff", label: "Staff team", roles: ["owner", "admin"] },
  { href: "/admin/members", label: "Members", roles: ["owner", "admin"] },
  { href: "/member/membership", label: "Membership", roles: ["member"] },
  { href: "/member/book", label: "Book classes", roles: ["owner", "admin", "trainer", "member"] },
];

export async function AppNav() {
  const session = await getSession();

  return (
    <header className="border-b border-white/10 bg-neutral-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/GymSynk-Logo02-B-Wht.png"
            alt="GymSynk"
            width={168}
            height={36}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {session ? (
            <>
              {links
                .filter((link) => link.roles.includes(session.role))
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-white/90 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
              <span className="hidden text-sm text-white/60 sm:inline">
                {session.fullName} · {session.tenantSlug}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/join"
                className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium text-white/90 hover:bg-white/10"
              >
                Join
              </Link>
              <Link
                href="/login"
                className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] bg-white px-2.5 text-[0.8rem] font-medium text-neutral-950 hover:bg-white/90"
              >
                Log in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
