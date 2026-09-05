import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

const links = [
  { href: "/admin/schedule", label: "Schedule", roles: ["owner", "admin", "trainer"] },
  { href: "/admin/roster", label: "Staff roster", roles: ["owner", "admin"] },
  { href: "/member/book", label: "Book classes", roles: ["owner", "admin", "trainer", "member"] },
];

export async function AppNav() {
  const session = await getSession();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          gymsynk
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
                    className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.fullName} · {session.tenantSlug}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
