import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { AdminScheduleView } from "@/components/admin-schedule-view";
import { canManageSchedules, getSession } from "@/lib/auth";

export default async function AdminSchedulePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!canManageSchedules(session.role)) {
    redirect("/member/book");
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Class schedule</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming classes for {session.tenantSlug}
          </p>
        </div>
        <AdminScheduleView />
      </main>
    </>
  );
}
