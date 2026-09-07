import { redirect } from "next/navigation";

import { AdminStaffView } from "@/components/admin-staff-view";
import { AppNav } from "@/components/app-nav";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminStaffPage() {
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
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold">Staff team</h1>
          <p className="text-sm text-muted-foreground">
            Add, pause, or remove staff. Bios and photos are saved for future
            marketing pages.
          </p>
        </div>
        <AdminStaffView />
      </main>
    </>
  );
}
