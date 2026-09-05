import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { StaffRosterView } from "@/components/staff-roster-view";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminRosterPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!canManageStaff(session.role)) {
    redirect("/member/book");
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Staff roster</h1>
          <p className="text-sm text-muted-foreground">
            Shift planning for {session.tenantSlug}
          </p>
        </div>
        <StaffRosterView />
      </main>
    </>
  );
}
