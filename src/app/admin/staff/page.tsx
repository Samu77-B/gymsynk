import { redirect } from "next/navigation";

import { AdminStaffView } from "@/components/admin-staff-view";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminStaffPage() {
  const session = await getSession();

  if (!canManageStaff(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, pause, or remove staff. Bios and photos are saved for future
          marketing pages.
        </p>
      </div>
      <AdminStaffView />
    </div>
  );
}
