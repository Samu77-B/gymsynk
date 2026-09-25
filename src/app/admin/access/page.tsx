import { redirect } from "next/navigation";

import { AdminAccessScanner } from "@/components/admin-access-scanner";
import { getSession } from "@/lib/auth";
import { canScanDoorAccess } from "@/lib/gym-access";
import { getTenantFeatures } from "@/lib/tenant-features";

export default async function AdminAccessPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!canScanDoorAccess(session.role)) {
    redirect("/");
  }

  const features = await getTenantFeatures(session.tenantSlug);

  if (!features?.doorEntry) {
    redirect("/admin/settings");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Door entry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan member QR passes. Active memberships and staff are allowed in.
        </p>
      </div>
      <AdminAccessScanner />
    </div>
  );
}
