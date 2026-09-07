import { redirect } from "next/navigation";

import { AdminMembersView } from "@/components/admin-members-view";
import { AppNav } from "@/components/app-nav";
import { canManageStaff, getSession } from "@/lib/auth";
import {
  listTenantMemberships,
  membershipStatusLabel,
} from "@/lib/membership";

export default async function AdminMembersPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!canManageStaff(session.role)) {
    redirect("/member/book");
  }

  const rows = await listTenantMemberships(session.tenantId);

  const memberships = rows.map((membership) => ({
    id: membership.id,
    planName: membership.plan.name,
    status: membership.status,
    statusLabel: membershipStatusLabel(membership.status),
    primaryName: membership.primaryUser.fullName,
    primaryEmail: membership.primaryUser.email,
    memberCount: membership.members.length,
    maxMembers: membership.plan.maxMembers,
    trialEndsAt: membership.trialEndsAt?.toISOString() ?? null,
    members: membership.members.map((member) => ({
      fullName: member.user.fullName,
      email: member.user.email,
      isPrimary: member.isPrimary,
    })),
  }));

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Members</h1>
            <p className="text-sm text-muted-foreground">
              Memberships, trial status, and linked family members.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Join link:{" "}
            <code>/join?tenant={session.tenantSlug}</code>
          </p>
        </div>
        <AdminMembersView memberships={memberships} />
      </main>
    </>
  );
}
