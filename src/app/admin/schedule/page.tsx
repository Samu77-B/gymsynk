import { redirect } from "next/navigation";

import { AdminScheduleView } from "@/components/admin-schedule-view";
import { canManageSchedules, getSession } from "@/lib/auth";

export default async function AdminSchedulePage() {
  const session = await getSession();

  if (!canManageSchedules(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Class schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming classes for {session!.tenantSlug}
        </p>
      </div>
      <AdminScheduleView role={session!.role} tenantSlug={session!.tenantSlug} />
    </div>
  );
}
