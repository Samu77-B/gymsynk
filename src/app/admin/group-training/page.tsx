import { redirect } from "next/navigation";

import { AdminGroupTrainingView } from "@/components/admin-group-training-view";
import { canManageClasses, getSession } from "@/lib/auth";
import { getTenantFeaturesById } from "@/lib/tenant-features";

export default async function AdminGroupTrainingPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Group training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tiers, session packs, and class assignments for {session!.tenantSlug}.
          Changes appear on your website packages embed.
        </p>
      </div>
      <AdminGroupTrainingView tenantSlug={session!.tenantSlug} />
    </div>
  );
}
