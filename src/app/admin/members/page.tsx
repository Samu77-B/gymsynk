import { redirect } from "next/navigation";

import { AdminMembersView } from "@/components/admin-members-view";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminMembersPage() {
  const session = await getSession();

  if (!canManageStaff(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full member records — personal details, health, membership, billing,
          and legal consent.
        </p>
      </div>
      <AdminMembersView tenantSlug={session!.tenantSlug} />
    </div>
  );
}
