import { redirect } from "next/navigation";

import { AdminMemberPacksView } from "@/components/admin-member-packs-view";
import { canManageClasses, getSession } from "@/lib/auth";
import { getTenantFeaturesById } from "@/lib/tenant-features";

export default async function AdminMemberPacksPage() {
  const session = await getSession();

  if (!canManageClasses(session!.role)) {
    redirect("/member/book");
  }

  const features = await getTenantFeaturesById(session!.tenantId);

  if (!features?.sessionPacks) {
    redirect("/admin/settings");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Member packs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sessions are drawn down automatically when a member books a class in
          the matching tier, and returned if they cancel. Credits refill at the
          start of each period and do not roll over.
        </p>
      </div>
      <AdminMemberPacksView />
    </div>
  );
}
