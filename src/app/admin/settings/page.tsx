import { redirect } from "next/navigation";

import { TenantBrandingForm } from "@/components/tenant-branding-form";
import { canManageStaff, getSession } from "@/lib/auth";

export default async function AdminSettingsPage() {
  const session = await getSession();

  if (!canManageStaff(session!.role)) {
    redirect("/member/book");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gym branding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your logo and set your brand colour. Members and staff will see
          your gym identity across the dashboard.
        </p>
      </div>
      <TenantBrandingForm />
    </div>
  );
}
