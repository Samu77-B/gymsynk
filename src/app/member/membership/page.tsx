import { redirect } from "next/navigation";

import { MembershipView } from "@/components/membership-view";
import { getSession } from "@/lib/auth";
import { getTenantFeatures } from "@/lib/tenant-features";

export default async function MemberMembershipPage() {
  const session = await getSession();
  const features = await getTenantFeatures(session!.tenantSlug);

  if (!features?.memberships) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your membership
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan and add family members where your plan allows.
        </p>
      </div>
      <MembershipView />
    </div>
  );
}
