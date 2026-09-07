import { redirect } from "next/navigation";

import { AdminMembersView } from "@/components/admin-members-view";
import { AppNav } from "@/components/app-nav";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminMembersPage() {
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
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Full member records for Reset — personal details, health, membership,
            billing notes, and legal consent.
          </p>
        </div>
        <AdminMembersView tenantSlug={session.tenantSlug} />
      </main>
    </>
  );
}
