import { redirect } from "next/navigation";

import { StaffRosterView } from "@/components/staff-roster-view";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminRosterPage() {
  const session = await getSession();

  if (!canManageStaff(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff roster</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shift planning for {session!.tenantSlug}
        </p>
      </div>
      <StaffRosterView />
    </div>
  );
}
